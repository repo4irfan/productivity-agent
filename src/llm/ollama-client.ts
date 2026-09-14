import ollama from "ollama";

export async function chatWithOllama(
  message: string
) {
  const response = await ollama.chat({
    model: "qwen2.5:7b",
    messages: [
      {
        role: "user",
        content: message,
      },
    ],
  });

  return response.message.content;
}