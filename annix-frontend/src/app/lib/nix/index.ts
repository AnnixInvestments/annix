export {
  type NixClarificationContext,
  type NixClarificationDto,
  type NixCorrectionPayload,
  type NixExtractedItem,
  type NixExtractionMetadata,
  type NixProcessResponse,
  nixApi,
} from "./api";
export {
  type ChatMessage,
  type ChatSession,
  type CreateItemsResponse,
  type ItemConfirmation,
  nixChatApi,
  type ParsedItem,
  type ParsedItemSpecifications,
  type ParseItemsResponse,
  type StreamChunk,
  type ValidationIssue,
} from "./chat-api";
export { default as NixAiPopup } from "./components/NixAiPopup";
export { NixAssistant } from "./components/NixAssistant";
export { NixChatPanel } from "./components/NixChatPanel";
export { default as NixClarificationPopup } from "./components/NixClarificationPopup";
export { default as NixFloatingAvatar } from "./components/NixFloatingAvatar";
export { default as NixProcessingPopup } from "./components/NixProcessingPopup";
export { ParsedItemsConfirmation } from "./components/ParsedItemsConfirmation";
