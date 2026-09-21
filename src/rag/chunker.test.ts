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

    it("starts a new chunk at each heading", () => {
        const text = "# Title\n\nIntro.\n\n## One\n\nFirst.\n\n## Two\n\nSecond.";

        expect(chunkText(text)).toEqual([
            "# Title\n\nIntro.",
            "## One\n\nFirst.",
            "## Two\n\nSecond.",
        ]);
    });

    it("does not emit a chunk that is only a heading", () => {
        expect(chunkText("# A\n\n## B\n\nBody.")).toEqual(["# A\n\n## B\n\nBody."]);
    });

});