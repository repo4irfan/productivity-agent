/**
 * Cosine similarity: 1 = same direction, 0 = unrelated, -1 = opposite.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector length mismatch: ${a.length} vs ${b.length}`
    );
  }

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;

    dot += x * y;
    magnitudeA += x * x;
    magnitudeB += y * y;
  }

  const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

  return denominator === 0 ? 0 : dot / denominator;
}