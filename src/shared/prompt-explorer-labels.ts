import type {
  PromptExplorerModel,
  WebSearchCountryCode,
} from "@/types/schemas/ai-search";
import { formatJapaneseCountryName } from "@/shared/country-labels-ja";

const MODEL_LABELS: Record<PromptExplorerModel, string> = {
  chat_gpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

export function formatModelLabel(model: PromptExplorerModel): string {
  return MODEL_LABELS[model];
}

export function formatCountryLabel(code: WebSearchCountryCode): string {
  return formatJapaneseCountryName(code);
}
