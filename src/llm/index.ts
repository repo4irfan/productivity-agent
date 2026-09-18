import type { LLMClient } from "./llm-client";
import { OllamaClient } from "./ollama-client";
import { OpenAIClient } from "./openai-client";


let client: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (client) {
    return client;
  }

  const provider = process.env.LLM_PROVIDER ?? "ollama";
  const debug = process.env.DEBUG === "true";

  switch (provider) {
    case "ollama":
      client = new OllamaClient({
        model: process.env.LLM_MODEL ?? "qwen2.5:7b",
        numCtx: Number(process.env.OLLAMA_NUM_CTX ?? 8192),
        debug,
      });
      break;
    
    case "openai":
      client = new OpenAIClient({
        model: process.env.LLM_MODEL ?? "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY,
        debug,
      });
      break;

    default:
      throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
  }

  return client;
}