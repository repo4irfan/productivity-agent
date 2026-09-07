import {
  saveMemory,
  listMemories,
} from "../memory/memory-repository";

export async function remember(
  content: string
) {
  return saveMemory(content);
}

export async function getMemories() {
  return listMemories();
}