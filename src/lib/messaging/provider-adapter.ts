export type MessageChannel = "LINE" | "SMS" | "EMAIL";

export type ProviderSendRequest = {
  messageJobId: string;
  channel: MessageChannel;
  destination: string;
  payload: Record<string, unknown> | null;
};

export type ProviderSendResult = {
  providerMessageId: string | null;
  status: "SENT" | "FAILED";
  failureCode: string | null;
  failureReason: string | null;
  responseMetadata: Record<string, unknown> | null;
};

export type MessageProviderAdapter = {
  providerCode: string;
  channel: MessageChannel;
  isReady(): boolean;
  send(request: ProviderSendRequest): Promise<ProviderSendResult>;
};

export function sanitizeProviderFailure(error: unknown): Pick<ProviderSendResult, "failureCode" | "failureReason" | "responseMetadata"> {
  const message = error instanceof Error ? error.message : "provider request failed";

  return {
    failureCode: "PROVIDER_REQUEST_FAILED",
    failureReason: message.slice(0, 160),
    responseMetadata: null,
  };
}
