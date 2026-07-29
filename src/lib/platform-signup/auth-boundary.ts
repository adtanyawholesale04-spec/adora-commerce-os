import "server-only";

export const PLATFORM_SIGNUP_CALLBACK_PATH = "/auth/platform/callback";
export const PLATFORM_ONBOARDING_PATH = "/onboarding";
export const PLATFORM_CALLBACK_STATE_VERSION = 1 as const;

export type PlatformAcquisitionEvidence =
  | { source: "PLATFORM_DIRECT" }
  | { source: "PLATFORM_CAMPAIGN"; campaignReference: string }
  | { source: "REFERRAL"; referralReference: string };

export type PlatformCallbackState = {
  version: typeof PLATFORM_CALLBACK_STATE_VERSION;
  intent: "PLATFORM_SIGNUP";
  requestId: string;
  displayName: string;
  acquisition: PlatformAcquisitionEvidence;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
};

export type PlatformAuthControlledCode =
  | "signup_request_accepted"
  | "feature_disabled"
  | "invalid_request"
  | "verification_required"
  | "callback_state_invalid"
  | "callback_state_expired"
  | "rate_limited"
  | "auth_unavailable"
  | "persistence_error";

export type PlatformAuthResult<T = undefined> =
  | { ok: true; code: "signup_request_accepted"; data: T }
  | {
      ok: false;
      code: Exclude<PlatformAuthControlledCode, "signup_request_accepted">;
    };

export type PlatformSignupRateLimiter = {
  consume(input: {
    scope: "platform_signup";
    ipAddress: string;
    destination: string;
  }): Promise<{ allowed: boolean }>;
};

export type PlatformCallbackStateCodec = {
  seal(state: PlatformCallbackState): Promise<string>;
  open(sealedState: string): Promise<PlatformCallbackState | null>;
};

export type PlatformEmailPasswordAuthGateway = {
  requestSignup(input: {
    email: string;
    password: string;
    captchaToken: string;
    callbackUrl: string;
  }): Promise<
    | { accepted: true }
    | { accepted: false; reason: "rate_limited" | "auth_unavailable" }
  >;
};

export type PlatformCallbackSessionGateway = {
  exchangeCodeForSession(code: string): Promise<{ exchanged: boolean }>;
  getVerifiedUser(): Promise<
    | {
        verified: true;
        authUserId: string;
        confirmedEmail: string;
      }
    | { verified: false }
  >;
};

export type PlatformAccountBootstrapPort = {
  bootstrap(input: {
    verifiedAuthUserId: string;
    requestId: string;
    displayName: string;
    acquisition: PlatformAcquisitionEvidence;
    ipAddress: string;
    destination: string;
  }): Promise<
    | { ok: true; profileId: string }
    | {
        ok: false;
        code:
          | "feature_disabled"
          | "auth_contact_not_verified"
          | "acquisition_already_captured"
          | "request_conflict"
          | "persistence_error";
      }
  >;
};

export type PlatformAuthBoundaryDependencies = {
  rateLimiter: PlatformSignupRateLimiter;
  callbackStateCodec: PlatformCallbackStateCodec;
  authGateway: PlatformEmailPasswordAuthGateway;
  availability: () => boolean;
  now: () => Date;
};

export type PlatformCallbackBoundaryDependencies = {
  sessionGateway: PlatformCallbackSessionGateway;
  callbackStateCodec: PlatformCallbackStateCodec;
  accountBootstrap: PlatformAccountBootstrapPort;
  availability: () => boolean;
  now: () => Date;
};

export type PlatformSignupRequest = {
  email: string;
  password: string;
  displayName: string;
  acquisition: PlatformAcquisitionEvidence;
  captchaToken: string;
  requestId: string;
  ipAddress: string;
};

export function isValidTurnstileTokenShape(token: string) {
  return token.length >= 1 && token.length <= 2048;
}

export type PlatformCallbackRequest = {
  code: string;
  sealedState: string;
  ipAddress: string;
};

export function isFixedPlatformRedirectPath(path: string) {
  return path === PLATFORM_ONBOARDING_PATH;
}

export function isPlatformCallbackStateCurrent(state: PlatformCallbackState, now: Date) {
  if (
    state.version !== PLATFORM_CALLBACK_STATE_VERSION ||
    state.intent !== "PLATFORM_SIGNUP"
  ) {
    return false;
  }
  const issuedAt = Date.parse(state.issuedAt);
  const expiresAt = Date.parse(state.expiresAt);
  const nowMs = now.getTime();
  return (
    Number.isFinite(issuedAt) &&
    Number.isFinite(expiresAt) &&
    issuedAt <= nowMs &&
    expiresAt > nowMs &&
    expiresAt - issuedAt <= 15 * 60 * 1000
  );
}
