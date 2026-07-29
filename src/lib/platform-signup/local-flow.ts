import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import {
  isValidTurnstileTokenShape,
  PLATFORM_SIGNUP_CALLBACK_PATH,
  type PlatformAcquisitionEvidence,
} from "@/lib/platform-signup/auth-boundary";
import {
  createPlatformSignupServerAdapters,
  getPlatformAppOrigin,
  PlatformSignupAdapterConfigError,
  type PlatformSignupAdapterDependencies,
} from "@/lib/platform-signup/adapters";
import {
  createPlatformSignupService,
  isPlatformSignupAvailable,
} from "@/lib/platform-signup/service";
import { createSupabaseAuthAdminClient } from "@/lib/supabase/admin";

export const PLATFORM_SIGNUP_STATE_COOKIE = "acos_platform_signup_state";
export const PLATFORM_SIGNUP_STATE_MAX_AGE_SECONDS = 15 * 60;

export type PlatformSignupActionResult =
  | { ok: true; code: "signup_request_accepted"; sealedState: string }
  | {
      ok: false;
      code: "feature_disabled" | "invalid_request" | "rate_limited" | "auth_unavailable";
    };

export type PlatformCallbackResult =
  | { ok: true; code: "account_ready" }
  | {
      ok: false;
      code:
        | "feature_disabled"
        | "callback_state_invalid"
        | "verification_required"
        | "rate_limited"
        | "persistence_error";
    };

export function isLocalPlatformSignupAvailable(
  env: NodeJS.ProcessEnv = process.env,
) {
  if (env.NODE_ENV === "production" || !isPlatformSignupAvailable()) {
    return false;
  }
  try {
    return getPlatformAppOrigin(env) === "http://localhost:3000";
  } catch {
    return false;
  }
}

export async function requestLocalPlatformSignup(
  input: {
    email: string;
    password: string;
    displayName: string;
    captchaToken: string;
    acquisition?: PlatformAcquisitionEvidence;
  },
  dependencies: PlatformSignupAdapterDependencies = {},
): Promise<PlatformSignupActionResult> {
  if (!isLocalPlatformSignupAvailable(dependencies.env ?? process.env)) {
    return { ok: false, code: "feature_disabled" };
  }

  const email = normalizeEmail(input.email);
  const displayName = normalizeText(input.displayName, 120);
  if (
    !email ||
    !displayName ||
    input.password.length < 8 ||
    input.password.length > 128 ||
    !isValidTurnstileTokenShape(input.captchaToken)
  ) {
    return { ok: false, code: "invalid_request" };
  }

  try {
    const now = dependencies.now ?? (() => new Date());
    const adapters = createPlatformSignupServerAdapters({ ...dependencies, now });
    const limit = await adapters.rateLimiter.consume({
      scope: "platform_signup",
      ipAddress: "127.0.0.1",
      destination: email,
    });
    if (!limit.allowed) return { ok: false, code: "rate_limited" };

    const issuedAt = now();
    const sealedState = await adapters.callbackStateCodec.seal({
      version: 1,
      intent: "PLATFORM_SIGNUP",
      requestId: randomUUID(),
      displayName,
      acquisition: input.acquisition ?? { source: "PLATFORM_DIRECT" },
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(
        issuedAt.getTime() + PLATFORM_SIGNUP_STATE_MAX_AGE_SECONDS * 1000,
      ).toISOString(),
      nonce: randomBytes(24).toString("base64url"),
    });
    const authResult = await adapters.authGateway.requestSignup({
      email,
      password: input.password,
      captchaToken: input.captchaToken,
      callbackUrl: adapters.callbackUrl,
    });
    if (!authResult.accepted) {
      return { ok: false, code: authResult.reason };
    }
    return { ok: true, code: "signup_request_accepted", sealedState };
  } catch (error) {
    return {
      ok: false,
      code:
        error instanceof PlatformSignupAdapterConfigError
          ? "feature_disabled"
          : "auth_unavailable",
    };
  }
}

export async function completeLocalPlatformSignupCallback(
  input: { code: string | null; sealedState: string | null },
  dependencies: PlatformSignupAdapterDependencies = {},
): Promise<PlatformCallbackResult> {
  if (!isLocalPlatformSignupAvailable(dependencies.env ?? process.env)) {
    return { ok: false, code: "feature_disabled" };
  }
  if (!input.sealedState) {
    return { ok: false, code: "callback_state_invalid" };
  }

  try {
    const adapters = createPlatformSignupServerAdapters(dependencies);
    const state = await adapters.callbackStateCodec.open(input.sealedState);
    if (!state) return { ok: false, code: "callback_state_invalid" };

    if (input.code) {
      await adapters.sessionGateway.exchangeCodeForSession(input.code);
    }
    const verified = await adapters.sessionGateway.getVerifiedUser();
    if (!verified.verified) {
      return { ok: false, code: "verification_required" };
    }

    const result = await adapters.accountBootstrap.bootstrap({
      verifiedAuthUserId: verified.authUserId,
      requestId: state.requestId,
      displayName: state.displayName,
      acquisition: state.acquisition,
      ipAddress: "127.0.0.1",
      destination: verified.confirmedEmail,
    });
    if (result.ok) return { ok: true, code: "account_ready" };
    if (result.code === "feature_disabled") {
      return { ok: false, code: "feature_disabled" };
    }
    return {
      ok: false,
      code:
        result.code === "persistence_error"
          ? "persistence_error"
          : result.code === "auth_contact_not_verified"
            ? "verification_required"
            : "persistence_error",
    };
  } catch {
    return { ok: false, code: "persistence_error" };
  }
}

export async function getLocalPlatformOnboardingSnapshot(authUserId: string) {
  if (!isLocalPlatformSignupAvailable()) {
    return { ok: false as const, code: "feature_disabled" as const };
  }
  const service = createPlatformSignupService({
    client: createSupabaseAuthAdminClient(),
  });
  return service.getPlatformOnboardingSnapshot(authUserId);
}

export function platformCallbackCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: PLATFORM_SIGNUP_CALLBACK_PATH,
    maxAge: PLATFORM_SIGNUP_STATE_MAX_AGE_SECONDS,
  };
}

function normalizeEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.length >= 3 &&
    normalized.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? normalized
    : null;
}

function normalizeText(value: string, maxLength: number) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 1 && normalized.length <= maxLength
    ? normalized
    : null;
}
