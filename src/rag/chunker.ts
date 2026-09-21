export type ChunkOptions = {
  maxChars?: number;
};

/**
 * Splits text into chunks of roughly maxChars, cutting at paragraph
 * boundaries. Each chunk begins with the last paragraph of the previous
 * one so an idea split across a boundary is still retrievable.
 */
export function chunkText(
  text: string,
  { maxChars = 800 }: ChunkOptions = {}
): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  const chunks: string[] = [];
  let current = "";
  let previousParagraph = "";

  for (const paragraph of paragraphs) {

    const isHeading = /^#{1,6}\s/.test(paragraph);

    // A heading always starts a new chunk: one section = one topic.
    if (isHeading && current && !isHeadingOnly(current)) {
      chunks.push(current);
      current = paragraph;
      previousParagraph = "";
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length > maxChars && current) {
      chunks.push(current);

      const overlap =
        previousParagraph.length < maxChars / 2 ? previousParagraph : "";

      current = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
    } else {
      current = candidate;
    }

    previousParagraph = paragraph;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function isHeadingOnly(chunk: string): boolean {
  return /^#{1,6}\s[^\n]*$/.test(chunk.trim());
}