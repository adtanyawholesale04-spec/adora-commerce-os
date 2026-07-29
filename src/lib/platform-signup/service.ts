import "server-only";

import { createSupabaseAuthAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9_]{1,38}[a-z0-9])?$/;

export type PlatformSignupResultCode =
  | "account_ready"
  | "onboarding_in_progress"
  | "onboarding_completed"
  | "feature_disabled"
  | "auth_contact_not_verified"
  | "acquisition_already_captured"
  | "invalid_acquisition_source"
  | "invalid_interest_selection"
  | "current_terms_not_accepted"
  | "terms_version_not_current"
  | "public_handle_unavailable"
  | "rate_limited"
  | "request_conflict"
  | "persistence_error";

type PlatformSignupSuccessCode =
  | "account_ready"
  | "onboarding_in_progress"
  | "onboarding_completed";
type PlatformSignupErrorCode = Exclude<PlatformSignupResultCode, PlatformSignupSuccessCode>;

export type PlatformSignupResult<T = Record<string, unknown>> =
  | { ok: true; code: PlatformSignupSuccessCode; data: T }
  | { ok: false; code: PlatformSignupErrorCode };

export type PlatformSignupAbuseContext = {
  ipHash: string;
  destinationHash: string;
};

export type PlatformSignupAbuseGuard = {
  consume(input: {
    scope: "platform_signup";
    ipHash: string;
    destinationHash: string;
  }): Promise<{ allowed: boolean }>;
};

type RpcClient = Pick<ReturnType<typeof createSupabaseAuthAdminClient>, "rpc">;

type ServiceDependencies = {
  client?: RpcClient;
  abuseGuard?: PlatformSignupAbuseGuard;
  availability?: () => boolean;
};

type AcquisitionInput =
  | { source: "PLATFORM_DIRECT"; campaignReference?: never; referralReference?: never }
  | { source: "PLATFORM_CAMPAIGN"; campaignReference: string; referralReference?: never }
  | { source: "REFERRAL"; campaignReference?: never; referralReference: string };

export function createPlatformSignupService(dependencies: ServiceDependencies = {}) {
  const availability = dependencies.availability ?? isPlatformSignupAvailable;
  const client = () => dependencies.client ?? createSupabaseAuthAdminClient();

  async function bootstrapPlatformAccount(input: {
    verifiedAuthUserId: string;
    displayName: string;
    acquisition: AcquisitionInput;
    requestId: string;
    abuse: PlatformSignupAbuseContext;
  }): Promise<PlatformSignupResult> {
    if (!availability()) return disabled();
    if (!dependencies.abuseGuard) return { ok: false, code: "rate_limited" };

    const normalized = normalizeBootstrapInput(input);
    if (!normalized) return { ok: false, code: "invalid_acquisition_source" };

    try {
      const decision = await dependencies.abuseGuard.consume({
        scope: "platform_signup",
        ipHash: normalized.abuse.ipHash,
        destinationHash: normalized.abuse.destinationHash,
      });
      if (!decision.allowed) return { ok: false, code: "rate_limited" };
    } catch {
      return { ok: false, code: "rate_limited" };
    }

    return callRpc(client(), "api_bootstrap_platform_account", {
      p_auth_user_id: normalized.verifiedAuthUserId,
      p_display_name: normalized.displayName,
      p_acquisition_source: normalized.acquisition.source,
      p_campaign_reference: normalized.acquisition.campaignReference ?? null,
      p_referral_reference: normalized.acquisition.referralReference ?? null,
      p_request_id: normalized.requestId,
    });
  }

  async function getPlatformOnboardingSnapshot(
    verifiedAuthUserId: string,
  ): Promise<PlatformSignupResult> {
    if (!availability()) return disabled();
    if (!isUuid(verifiedAuthUserId)) return persistenceFailure();
    return callRpc(client(), "api_get_platform_onboarding_snapshot", {
      p_auth_user_id: verifiedAuthUserId,
    });
  }

  async function updatePlatformInterests(input: {
    verifiedAuthUserId: string;
    interestTopicIds: string[];
    requestId: string;
  }): Promise<PlatformSignupResult> {
    if (!availability()) return disabled();
    const ids = [...new Set(input.interestTopicIds)];
    if (
      !isUuid(input.verifiedAuthUserId) ||
      !isUuid(input.requestId) ||
      ids.length < 1 ||
      ids.length > 20 ||
      ids.length !== input.interestTopicIds.length ||
      ids.some((id) => !isUuid(id))
    ) {
      return { ok: false, code: "invalid_interest_selection" };
    }
    return callRpc(client(), "api_update_platform_interests", {
      p_auth_user_id: input.verifiedAuthUserId,
      p_interest_topic_ids: ids,
      p_request_id: input.requestId,
    });
  }

  async function recordCommunityTermsDecision(input: {
    verifiedAuthUserId: string;
    termsVersionId: string;
    decision: "ACCEPTED" | "WITHDRAWN";
    requestId: string;
  }): Promise<PlatformSignupResult> {
    if (!availability()) return disabled();
    if (![input.verifiedAuthUserId, input.termsVersionId, input.requestId].every(isUuid)) {
      return { ok: false, code: "terms_version_not_current" };
    }
    return callRpc(client(), "api_record_community_terms_decision", {
      p_auth_user_id: input.verifiedAuthUserId,
      p_terms_version_id: input.termsVersionId,
      p_event_type: input.decision,
      p_request_id: input.requestId,
    });
  }

  async function updatePublicProfileDraft(input: {
    verifiedAuthUserId: string;
    displayName: string;
    handleCandidate?: string | null;
    bio?: string | null;
    optInIntent: boolean;
    requestId: string;
  }): Promise<PlatformSignupResult> {
    if (!availability()) return disabled();
    const displayName = normalizeText(input.displayName, 120);
    const bio = normalizeOptionalText(input.bio, 500);
    const handle = normalizeHandle(input.handleCandidate);
    if (
      !isUuid(input.verifiedAuthUserId) ||
      !isUuid(input.requestId) ||
      !displayName ||
      bio === undefined ||
      handle === undefined
    ) {
      return persistenceFailure();
    }
    return callRpc(client(), "api_update_public_profile_draft", {
      p_auth_user_id: input.verifiedAuthUserId,
      p_display_name: displayName,
      p_handle_candidate: handle,
      p_bio: bio,
      p_opt_in_intent: input.optInIntent,
      p_request_id: input.requestId,
    });
  }

  async function completePlatformOnboarding(input: {
    verifiedAuthUserId: string;
    requestId: string;
  }): Promise<PlatformSignupResult> {
    if (!availability()) return disabled();
    if (!isUuid(input.verifiedAuthUserId) || !isUuid(input.requestId)) {
      return persistenceFailure();
    }
    return callRpc(client(), "api_complete_platform_onboarding", {
      p_auth_user_id: input.verifiedAuthUserId,
      p_request_id: input.requestId,
    });
  }

  return {
    bootstrapPlatformAccount,
    getPlatformOnboardingSnapshot,
    updatePlatformInterests,
    recordCommunityTermsDecision,
    updatePublicProfileDraft,
    completePlatformOnboarding,
  };
}

export function isPlatformSignupAvailable() {
  return (
    process.env.ACOS_PLATFORM_SIGNUP_ENABLED === "true" &&
    process.env.ACOS_PLATFORM_SIGNUP_KILL_SWITCH !== "true"
  );
}

async function callRpc(
  client: RpcClient,
  functionName: string,
  parameters: Record<string, unknown>,
): Promise<PlatformSignupResult> {
  try {
    const { data, error } = await client.rpc(functionName, parameters);
    if (error) return mapPersistenceError(error.message);
    const payload = normalizeRpcPayload(data);
    if (!payload) return persistenceFailure();
    const code = payload?.result;
    if (
      code !== "account_ready" &&
      code !== "onboarding_in_progress" &&
      code !== "onboarding_completed"
    ) {
      return persistenceFailure();
    }
    return { ok: true, code, data: payload };
  } catch {
    return persistenceFailure();
  }
}

function normalizeRpcPayload(data: unknown): Record<string, unknown> | null {
  const value = Array.isArray(data) ? data[0] : data;
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function mapPersistenceError(message: string): PlatformSignupResult {
  const controlledCodes: PlatformSignupErrorCode[] = [
    "auth_contact_not_verified",
    "acquisition_already_captured",
    "invalid_acquisition_source",
    "invalid_interest_selection",
    "current_terms_not_accepted",
    "terms_version_not_current",
    "public_handle_unavailable",
    "request_conflict",
  ];
  const code = controlledCodes.find((candidate) => message.includes(candidate));
  return code ? { ok: false, code } : persistenceFailure();
}

function normalizeBootstrapInput(input: {
  verifiedAuthUserId: string;
  displayName: string;
  acquisition: AcquisitionInput;
  requestId: string;
  abuse: PlatformSignupAbuseContext;
}) {
  const displayName = normalizeText(input.displayName, 200);
  const ipHash = normalizeOpaqueHash(input.abuse.ipHash);
  const destinationHash = normalizeOpaqueHash(input.abuse.destinationHash);
  if (
    !isUuid(input.verifiedAuthUserId) ||
    !isUuid(input.requestId) ||
    !displayName ||
    !ipHash ||
    !destinationHash
  ) {
    return null;
  }
  const campaignReference =
    input.acquisition.source === "PLATFORM_CAMPAIGN"
      ? normalizeReference(input.acquisition.campaignReference)
      : null;
  const referralReference =
    input.acquisition.source === "REFERRAL"
      ? normalizeReference(input.acquisition.referralReference)
      : null;
  if (
    (input.acquisition.source === "PLATFORM_CAMPAIGN" && !campaignReference) ||
    (input.acquisition.source === "REFERRAL" && !referralReference)
  ) {
    return null;
  }
  return {
    verifiedAuthUserId: input.verifiedAuthUserId,
    displayName,
    acquisition: { source: input.acquisition.source, campaignReference, referralReference },
    requestId: input.requestId,
    abuse: { ipHash, destinationHash },
  };
}

function normalizeText(value: string, maxLength: number) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 1 && normalized.length <= maxLength ? normalized : null;
}

function normalizeOptionalText(value: string | null | undefined, maxLength: number) {
  if (value == null || value.trim() === "") return null;
  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized : undefined;
}

function normalizeHandle(value: string | null | undefined) {
  if (value == null || value.trim() === "") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length >= 3 && normalized.length <= 40 && HANDLE_PATTERN.test(normalized)
    ? normalized
    : undefined;
}

function normalizeReference(value: string) {
  const normalized = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(normalized) ? normalized : null;
}

function normalizeOpaqueHash(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function disabled(): PlatformSignupResult {
  return { ok: false, code: "feature_disabled" };
}

function persistenceFailure(): PlatformSignupResult {
  return { ok: false, code: "persistence_error" };
}
