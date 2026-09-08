import {
  saveMemory,
  listMemories,
  searchMemories,
} from "../memory/memory-repository";

export async function remember(
  content: string
) {
  return saveMemory(content);
}

export async function getMemories() {
  return listMemories();
}

export async function searchMemory(query: string) {
  return searchMemories(query);
}