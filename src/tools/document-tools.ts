import { readDocument as readDocumentInDb, searchDocuments as searchDocumentsInDb, listDocuments as listDocumentsInDb } from "../rag/document-repository";

export async function readDocument(query: string) {
  return readDocumentInDb(query);
}

export async function searchDocuments(query: string) {
  return searchDocumentsInDb(query);
}

export async function listDocuments() {
  return listDocumentsInDb();
}