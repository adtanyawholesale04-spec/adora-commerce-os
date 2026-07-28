import type {
  MessageChannel,
  MessageProviderAdapter,
  ProviderSendRequest,
  ProviderSendResult,
} from "./provider-adapter";
import { sanitizeProviderFailure } from "./provider-adapter";

export type MessageJobForDispatch = {
  id: string;
  channel: MessageChannel;
  destination: string;
  payload: Record<string, unknown> | null;
};

export type ReservationResult = {
  status: "SENDING" | "SUPPRESSED" | "SKIPPED_NO_CONSENT";
  reservationReused: boolean;
};

export type DeliveryAttemptInput = {
  messageJobId: string;
  provider: string;
  status: "SENT" | "FAILED";
  providerMessageId: string | null;
  failureCode: string | null;
  failureReason: string | null;
  responseMetadata: Record<string, unknown> | null;
};

export type MessageWorkerDependencies = {
  reserve(jobId: string, providerReady: boolean, requestId: string): Promise<ReservationResult>;
  recordAttempt(input: DeliveryAttemptInput): Promise<void>;
};

export async function dispatchMessageJob(
  job: MessageJobForDispatch,
  adapter: MessageProviderAdapter,
  dependencies: MessageWorkerDependencies,
  reservationRequestId: string,
): Promise<ProviderSendResult | null> {
  if (adapter.channel !== job.channel || !adapter.isReady()) {
    return null;
  }

  const reservation = await dependencies.reserve(job.id, true, reservationRequestId);
  if (reservation.status !== "SENDING") {
    return null;
  }

  const request: ProviderSendRequest = {
    messageJobId: job.id,
    channel: job.channel,
    destination: job.destination,
    payload: job.payload,
  };

  try {
    const result = await adapter.send(request);
    await dependencies.recordAttempt({
      messageJobId: job.id,
      provider: adapter.providerCode,
      status: result.status,
      providerMessageId: result.providerMessageId,
      failureCode: result.failureCode,
      failureReason: result.failureReason,
      responseMetadata: result.responseMetadata,
    });
    return result;
  } catch (error) {
    const failure = sanitizeProviderFailure(error);
    const result: ProviderSendResult = {
      providerMessageId: null,
      status: "FAILED",
      ...failure,
    };

    await dependencies.recordAttempt({
      messageJobId: job.id,
      provider: adapter.providerCode,
      status: result.status,
      providerMessageId: result.providerMessageId,
      failureCode: result.failureCode,
      failureReason: result.failureReason,
      responseMetadata: result.responseMetadata,
    });
    return result;
  }
}
