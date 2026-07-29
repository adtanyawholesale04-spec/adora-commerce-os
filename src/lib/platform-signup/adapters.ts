import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { isIP } from "node:net";

import { createPlatformSignupService } from "@/lib/platform-signup/service";
import {
  isPlatformCallbackStateCurrent,
  PLATFORM_SIGNUP_CALLBACK_PATH,
  type PlatformAccountBootstrapPort,
  type PlatformAcquisitionEvidence,
  type PlatformCallbackSessionGateway,
  type PlatformCallbackState,
  type PlatformCallbackStateCodec,
  type PlatformEmailPasswordAuthGateway,
  type PlatformSignupRateLimiter,
} from "@/lib/platform-signup/auth-boundary";
import { createSupabaseAuthAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const HEX_DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CALLBACK_TOKEN_MAX_LENGTH = 4096;
const SECRET_MIN_BYTES = 32;

type RateLimitScope = "IP" | "DESTINATION" | "GLOBAL";

type RateLimitRule = {
  scope: RateLimitScope;
  windowSeconds: number;
  attemptLimit: number;
};

type RpcResult = {
  data: unknown;
  error: { message?: string } | null;
};

type RateLimitRpcClient = {
  rpc(
    functionName: string,
    parameters: Record<string, unknown>,
  ): PromiseLike<RpcResult>;
};

type SupabaseAuthClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type PlatformSignupAdapterDependencies = {
  rateLimitClient?: RateLimitRpcClient;
  authClient?: () => Promise<SupabaseAuthClient>;
  bootstrapClient?: Pick<ReturnType<typeof createSupabaseAuthAdminClient>, "rpc">;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
};

export type PlatformSignupServerAdapters = {
  rateLimiter: PlatformSignupRateLimiter;
  callbackStateCodec: PlatformCallbackStateCodec;
  authGateway: PlatformEmailPasswordAuthGateway;
  sessionGateway: PlatformCallbackSessionGateway;
  accountBootstrap: PlatformAccountBootstrapPort;
  callbackUrl: string;
};

export class PlatformSignupAdapterConfigError extends Error {
  constructor() {
    super("platform_signup_adapter_not_configured");
    this.name = "PlatformSignupAdapterConfigError";
  }
}

export function createPlatformSignupServerAdapters(
  dependencies: PlatformSignupAdapterDependencies = {},
): PlatformSignupServerAdapters {
  const env = dependencies.env ?? process.env;
  const now = dependencies.now ?? (() => new Date());
  const hasher = createIdentityHasher(env);
  const rateLimitClient =
    dependencies.rateLimitClient ?? createSupabaseAuthAdminClient();
  const rules = readRateLimitRules(env);
  const keyVersion = readBoundedInteger(
    env.ACOS_SIGNUP_ABUSE_HASH_KEY_VERSION,
    1,
    32767,
  );
  const rateLimiter = createDurableRateLimiter(
    rateLimitClient,
    hasher,
    keyVersion,
    rules,
  );
  const callbackStateCodec = createCallbackStateCodec(env, now);
  const callbackUrl = getPlatformCallbackUrl(env);
  const authClient = dependencies.authClient ?? createSupabaseServerClient;
  const authGateway = createEmailPasswordAuthGateway(authClient, callbackUrl);
  const sessionGateway = createCallbackSessionGateway(authClient);
  const accountBootstrap = createAccountBootstrapAdapter({
    client: dependencies.bootstrapClient ?? createSupabaseAuthAdminClient(),
    hasher,
    rateLimitClient,
    keyVersion,
    rules,
  });

  return {
    rateLimiter,
    callbackStateCodec,
    authGateway,
    sessionGateway,
    accountBootstrap,
    callbackUrl,
  };
}

export function getPlatformAppOrigin(env: NodeJS.ProcessEnv = process.env) {
  const rawOrigin = String(env.ACOS_PLATFORM_APP_ORIGIN ?? "").trim();

  try {
    const url = new URL(rawOrigin);
    const isLocal = url.protocol === "http:" &&
      url.hostname === "localhost" &&
      url.port === "3000";
    const isProduction = url.protocol === "https:" &&
      url.hostname !== "localhost" &&
      url.hostname !== "127.0.0.1";

    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      (env.NODE_ENV === "production" ? !isProduction : !isLocal && !isProduction)
    ) {
      throw new PlatformSignupAdapterConfigError();
    }

    return url.origin;
  } catch (error) {
    if (error instanceof PlatformSignupAdapterConfigError) throw error;
    throw new PlatformSignupAdapterConfigError();
  }
}

export function getPlatformCallbackUrl(env: NodeJS.ProcessEnv = process.env) {
  return new URL(PLATFORM_SIGNUP_CALLBACK_PATH, getPlatformAppOrigin(env)).toString();
}

function createIdentityHasher(env: NodeJS.ProcessEnv) {
  const secret = requiredSecret(env.ACOS_SIGNUP_ABUSE_HASH_SECRET);

  return {
    ip(value: string) {
      return hmacIdentity(secret, "IP", normalizeIpAddress(value));
    },
    destination(value: string) {
      return hmacIdentity(secret, "DESTINATION", normalizeEmail(value));
    },
    global() {
      return hmacIdentity(secret, "GLOBAL", "platform_signup");
    },
  };
}

function createDurableRateLimiter(
  client: RateLimitRpcClient,
  hasher: ReturnType<typeof createIdentityHasher>,
  keyVersion: number,
  rules: RateLimitRule[],
): PlatformSignupRateLimiter {
  return {
    async consume(input) {
      if (input.scope !== "platform_signup") {
        throw new PlatformSignupAdapterConfigError();
      }

      const digests: Record<RateLimitScope, string> = {
        IP: hasher.ip(input.ipAddress),
        DESTINATION: hasher.destination(input.destination),
        GLOBAL: hasher.global(),
      };
      const decisions = await Promise.all(
        rules.map(async (rule) => {
          const { data, error } = await client.rpc(
            "api_consume_platform_signup_rate_limit",
            {
              p_scope: rule.scope,
              p_identity_digest: digests[rule.scope],
              p_key_version: keyVersion,
              p_window_seconds: rule.windowSeconds,
              p_attempt_limit: rule.attemptLimit,
            },
          );
          if (error) throw new Error("rate_limit_unavailable");
          return readAllowedDecision(data);
        }),
      );

      return { allowed: decisions.every(Boolean) };
    },
  };
}

function createCallbackStateCodec(
  env: NodeJS.ProcessEnv,
  now: () => Date,
): PlatformCallbackStateCodec {
  const secret = requiredSecret(env.ACOS_PLATFORM_CALLBACK_STATE_SECRET);

  return {
    async seal(state) {
      if (!isValidCallbackStateShape(state) || !isPlatformCallbackStateCurrent(state, now())) {
        throw new Error("callback_state_invalid");
      }
      const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
      const signature = signCallbackPayload(secret, payload);
      const token = `${payload}.${signature}`;
      if (token.length > CALLBACK_TOKEN_MAX_LENGTH) {
        throw new Error("callback_state_invalid");
      }
      return token;
    },
    async open(token) {
      if (!token || token.length > CALLBACK_TOKEN_MAX_LENGTH) return null;
      const parts = token.split(".");
      if (parts.length !== 2) return null;
      const [payload, signature] = parts;
      const expected = signCallbackPayload(secret, payload);
      if (!safeEqual(signature, expected)) return null;

      try {
        const state = JSON.parse(
          Buffer.from(payload, "base64url").toString("utf8"),
        ) as unknown;
        return isValidCallbackStateShape(state) &&
          isPlatformCallbackStateCurrent(state, now())
          ? state
          : null;
      } catch {
        return null;
      }
    },
  };
}

function createEmailPasswordAuthGateway(
  clientFactory: () => Promise<SupabaseAuthClient>,
  approvedCallbackUrl: string,
): PlatformEmailPasswordAuthGateway {
  return {
    async requestSignup(input) {
      if (
        input.callbackUrl !== approvedCallbackUrl ||
        !isValidEmail(input.email) ||
        input.password.length < 8 ||
        input.password.length > 128 ||
        input.captchaToken.length < 1 ||
        input.captchaToken.length > 2048
      ) {
        return { accepted: false, reason: "auth_unavailable" };
      }

      try {
        const client = await clientFactory();
        const { error } = await client.auth.signUp({
          email: normalizeEmail(input.email),
          password: input.password,
          options: {
            captchaToken: input.captchaToken,
            emailRedirectTo: approvedCallbackUrl,
          },
        });
        if (!error) return { accepted: true };
        return {
          accepted: false,
          reason: error.status === 429 ? "rate_limited" : "auth_unavailable",
        };
      } catch {
        return { accepted: false, reason: "auth_unavailable" };
      }
    },
  };
}

function createCallbackSessionGateway(
  clientFactory: () => Promise<SupabaseAuthClient>,
): PlatformCallbackSessionGateway {
  let requestClient: SupabaseAuthClient | null = null;

  async function getRequestClient() {
    requestClient ??= await clientFactory();
    return requestClient;
  }

  return {
    async exchangeCodeForSession(code) {
      if (!code || code.length > 2048) return { exchanged: false };
      try {
        const client = await getRequestClient();
        const { error } = await client.auth.exchangeCodeForSession(code);
        return { exchanged: !error };
      } catch {
        return { exchanged: false };
      }
    },
    async getVerifiedUser() {
      try {
        const client = await getRequestClient();
        const {
          data: { user },
          error,
        } = await client.auth.getUser();
        const confirmedEmail = user?.email?.trim().toLowerCase();
        if (
          error ||
          !user ||
          !isUuid(user.id) ||
          !user.email_confirmed_at ||
          !confirmedEmail ||
          !isValidEmail(confirmedEmail)
        ) {
          return { verified: false };
        }
        return { verified: true, authUserId: user.id, confirmedEmail };
      } catch {
        return { verified: false };
      }
    },
  };
}

function createAccountBootstrapAdapter(input: {
  client: Pick<ReturnType<typeof createSupabaseAuthAdminClient>, "rpc">;
  hasher: ReturnType<typeof createIdentityHasher>;
  rateLimitClient: RateLimitRpcClient;
  keyVersion: number;
  rules: RateLimitRule[];
}): PlatformAccountBootstrapPort {
  const hashedGuard = createHashedBootstrapGuard(
    input.rateLimitClient,
    input.keyVersion,
    input.rules,
    input.hasher.global(),
  );
  const service = createPlatformSignupService({
    client: input.client,
    abuseGuard: hashedGuard,
  });

  return {
    async bootstrap(request) {
      try {
        const result = await service.bootstrapPlatformAccount({
          verifiedAuthUserId: request.verifiedAuthUserId,
          requestId: request.requestId,
          displayName: request.displayName,
          acquisition: request.acquisition,
          abuse: {
            ipHash: input.hasher.ip(request.ipAddress),
            destinationHash: input.hasher.destination(request.destination),
          },
        });
        if (result.ok) {
          const profileId = String(result.data.profile_id ?? "");
          return isUuid(profileId)
            ? { ok: true, profileId }
            : { ok: false, code: "persistence_error" };
        }
        if (
          result.code === "feature_disabled" ||
          result.code === "auth_contact_not_verified" ||
          result.code === "acquisition_already_captured" ||
          result.code === "request_conflict"
        ) {
          return { ok: false, code: result.code };
        }
        return { ok: false, code: "persistence_error" };
      } catch {
        return { ok: false, code: "persistence_error" };
      }
    },
  };
}

function createHashedBootstrapGuard(
  client: RateLimitRpcClient,
  keyVersion: number,
  rules: RateLimitRule[],
  globalDigest: string,
) {
  return {
    async consume(input: {
      scope: "platform_signup";
      ipHash: string;
      destinationHash: string;
    }) {
      if (
        input.scope !== "platform_signup" ||
        !HEX_DIGEST_PATTERN.test(input.ipHash) ||
        !HEX_DIGEST_PATTERN.test(input.destinationHash)
      ) {
        throw new Error("rate_limit_unavailable");
      }
      const digests: Record<RateLimitScope, string> = {
        IP: input.ipHash,
        DESTINATION: input.destinationHash,
        GLOBAL: globalDigest,
      };
      const decisions = await Promise.all(
        rules.map(async (rule) => {
          const { data, error } = await client.rpc(
            "api_consume_platform_signup_rate_limit",
            {
              p_scope: rule.scope,
              p_identity_digest: digests[rule.scope],
              p_key_version: keyVersion,
              p_window_seconds: rule.windowSeconds,
              p_attempt_limit: rule.attemptLimit,
            },
          );
          if (error) throw new Error("rate_limit_unavailable");
          return readAllowedDecision(data);
        }),
      );
      return { allowed: decisions.every(Boolean) };
    },
  };
}

function readRateLimitRules(env: NodeJS.ProcessEnv): RateLimitRule[] {
  return [
    {
      scope: "IP",
      windowSeconds: readBoundedInteger(
        env.ACOS_SIGNUP_RATE_LIMIT_IP_WINDOW_SECONDS,
        60,
        86400,
      ),
      attemptLimit: readBoundedInteger(
        env.ACOS_SIGNUP_RATE_LIMIT_IP_ATTEMPT_LIMIT,
        1,
        10000,
      ),
    },
    {
      scope: "DESTINATION",
      windowSeconds: readBoundedInteger(
        env.ACOS_SIGNUP_RATE_LIMIT_DESTINATION_WINDOW_SECONDS,
        60,
        86400,
      ),
      attemptLimit: readBoundedInteger(
        env.ACOS_SIGNUP_RATE_LIMIT_DESTINATION_ATTEMPT_LIMIT,
        1,
        10000,
      ),
    },
    {
      scope: "GLOBAL",
      windowSeconds: readBoundedInteger(
        env.ACOS_SIGNUP_RATE_LIMIT_GLOBAL_WINDOW_SECONDS,
        60,
        86400,
      ),
      attemptLimit: readBoundedInteger(
        env.ACOS_SIGNUP_RATE_LIMIT_GLOBAL_ATTEMPT_LIMIT,
        1,
        10000,
      ),
    },
  ];
}

function readAllowedDecision(data: unknown) {
  const value = Array.isArray(data) ? data[0] : data;
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as Record<string, unknown>).allowed !== "boolean"
  ) {
    throw new Error("rate_limit_unavailable");
  }
  return (value as Record<string, boolean>).allowed;
}

function readBoundedInteger(value: string | undefined, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new PlatformSignupAdapterConfigError();
  }
  return parsed;
}

function requiredSecret(value: string | undefined) {
  const secret = String(value ?? "");
  if (Buffer.byteLength(secret, "utf8") < SECRET_MIN_BYTES) {
    throw new PlatformSignupAdapterConfigError();
  }
  return secret;
}

function normalizeIpAddress(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!isIP(normalized)) throw new Error("invalid_ip_address");
  return normalized;
}

function normalizeEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!isValidEmail(normalized)) throw new Error("invalid_destination");
  return normalized;
}

function isValidEmail(value: string) {
  return value.length >= 3 &&
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hmacIdentity(secret: string, scope: RateLimitScope, value: string) {
  return createHmac("sha256", secret)
    .update(`acos:platform-signup:${scope}\0${value}`, "utf8")
    .digest("hex");
}

function signCallbackPayload(secret: string, payload: string) {
  return createHmac("sha256", secret)
    .update(`acos:platform-signup:callback:v1\0${payload}`, "utf8")
    .digest("base64url");
}

function safeEqual(actual: string, expected: string) {
  try {
    const actualBytes = Buffer.from(actual, "base64url");
    const expectedBytes = Buffer.from(expected, "base64url");
    return actualBytes.length === expectedBytes.length &&
      timingSafeEqual(actualBytes, expectedBytes);
  } catch {
    return false;
  }
}

function isValidCallbackStateShape(value: unknown): value is PlatformCallbackState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  const keys = Object.keys(state).sort();
  const expectedKeys = [
    "acquisition",
    "displayName",
    "expiresAt",
    "intent",
    "issuedAt",
    "nonce",
    "requestId",
    "version",
  ];
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) return false;
  if (
    state.version !== 1 ||
    state.intent !== "PLATFORM_SIGNUP" ||
    !isUuid(String(state.requestId ?? "")) ||
    typeof state.displayName !== "string" ||
    state.displayName.length < 1 ||
    state.displayName.length > 200 ||
    typeof state.issuedAt !== "string" ||
    typeof state.expiresAt !== "string" ||
    typeof state.nonce !== "string" ||
    state.nonce.length < 16 ||
    state.nonce.length > 128
  ) {
    return false;
  }
  return isValidAcquisition(state.acquisition);
}

function isValidAcquisition(value: unknown): value is PlatformAcquisitionEvidence {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const acquisition = value as Record<string, unknown>;
  if (acquisition.source === "PLATFORM_DIRECT") {
    return Object.keys(acquisition).length === 1;
  }
  if (acquisition.source === "PLATFORM_CAMPAIGN") {
    return Object.keys(acquisition).length === 2 &&
      isOpaqueReference(acquisition.campaignReference);
  }
  if (acquisition.source === "REFERRAL") {
    return Object.keys(acquisition).length === 2 &&
      isOpaqueReference(acquisition.referralReference);
  }
  return false;
}

function isOpaqueReference(value: unknown) {
  return typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(value);
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}
