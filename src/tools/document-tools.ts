import { searchDocuments as searchDocumentsInDb, listDocuments as listDocumentsInDb } from "../rag/document-repository";

export async function searchDocuments(query: string) {
  return searchDocumentsInDb(query);
}

export async function listDocuments() {
  return listDocumentsInDb();
}