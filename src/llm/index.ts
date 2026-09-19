import type { LLMClient, EmbeddingClient } from "./llm-client";
import { OllamaClient } from "./ollama-client";
import { OpenAIClient } from "./openai-client";

type ProviderClient = LLMClient & EmbeddingClient;

let client: ProviderClient | null = null;

function buildClient(): ProviderClient {
  const provider = process.env.LLM_PROVIDER ?? "ollama";
  const debug = process.env.DEBUG === "true";

  switch (provider) {
    case "ollama":
      return new OllamaClient({
        model: process.env.LLM_MODEL ?? "qwen2.5:7b",
        embeddingModel: process.env.EMBEDDING_MODEL ?? "nomic-embed-text",
        numCtx: Number(process.env.OLLAMA_NUM_CTX ?? 8192),
        debug,
      });

    case "openai":
      return new OpenAIClient({
        model: process.env.LLM_MODEL ?? "gpt-4o-mini",
        embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
        apiKey: process.env.OPENAI_API_KEY,
        debug,
      });

    default:
      throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
  }
}

function getClient(): ProviderClient {
  if (!client) {
    client = buildClient();
  }

  return client;
}

export function getLLMClient(): LLMClient {
  return getClient();
}

export function getEmbeddingClient(): EmbeddingClient {
  return getClient();
}