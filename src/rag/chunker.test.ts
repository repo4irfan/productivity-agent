import { describe, expect, it } from "vitest";
import { chunkText } from "./chunker";

describe("chunkText", () => {
  it("keeps a short document as one chunk", () => {
    expect(chunkText("Hello.\n\nWorld.")).toEqual(["Hello.\n\nWorld."]);
  });

  it("splits at paragraph boundaries with overlap", () => {
    const a = "A".repeat(300);
    const b = "B".repeat(300);
    const c = "C".repeat(300);

    const chunks = chunkText(`${a}\n\n${b}\n\n${c}`, { maxChars: 700 });

    expect(chunks).toEqual([`${a}\n\n${b}`, `${b}\n\n${c}`]);
  });

  it("ignores blank paragraphs", () => {
    expect(chunkText("\n\nOnly.\n\n\n")).toEqual(["Only."]);
  });
});