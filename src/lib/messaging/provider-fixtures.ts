import type { MessageChannel, MessageProviderAdapter, ProviderSendRequest } from "./provider-adapter";

export function createFixtureProviderAdapter(
  channel: MessageChannel,
  options: { providerCode?: string; fail?: boolean } = {},
): MessageProviderAdapter {
  return {
    providerCode: options.providerCode ?? `fixture-${channel.toLowerCase()}`,
    channel,
    isReady: () => true,
    async send(request: ProviderSendRequest) {
      if (options.fail) {
        throw new Error(`fixture ${channel} provider failure`);
      }

      return {
        providerMessageId: `fixture-${request.messageJobId}`,
        status: "SENT",
        failureCode: null,
        failureReason: null,
        responseMetadata: { fixture: true },
      };
    },
  };
}
