import { StringDecoder } from "node:string_decoder";
import type { Readable, Writable } from "node:stream";
import { stripVTControlCharacters } from "node:util";

/** Decline overwrites, then close stdin when shadcn finishes its file phase. */
export function respondToShadcnPrompts(subprocess: {
  stdin: Writable | null;
  stdout: Readable | null;
  stderr: Readable | null;
}) {
  function inspect(line: string, answered: Set<string>) {
    const stdin = subprocess.stdin;
    if (!stdin || stdin.destroyed || stdin.writableEnded) return;
    const text = stripVTControlCharacters(line);

    // A prompt has no trailing newline. Match the entire question so redraws
    // can be recognized without treating another file's prompt as a duplicate.
    for (const match of text.matchAll(
      /The file (.+?) already exists\. Would you like to overwrite\?[^\r\n]*?\(y\/N\)/gi,
    )) {
      const filename = match[1];
      if (answered.has(filename)) continue;
      answered.add(filename);
      stdin.write("n\n");
    }

    // After prompts, shadcn otherwise keeps reading the open stdin pipe.
    if (
      /(?:Created|Updated|Skipped)\s+\d+\s+file|No files updated/i.test(text)
    ) {
      stdin.end();
    }
  }

  for (const stream of [subprocess.stdout, subprocess.stderr]) {
    const decoder = new StringDecoder("utf8");
    const answered = new Set<string>();
    let pending = "";
    stream?.on("data", (chunk: string | Buffer) => {
      pending += typeof chunk === "string" ? chunk : decoder.write(chunk);
      const lines = pending.split("\n");
      pending = lines.pop()!;
      for (const line of lines) {
        inspect(line, answered);
        // prompts ends a completed question with a newline. A later question
        // can legitimately mention the same basename (for example index.ts).
        answered.clear();
      }
      // Retain the raw unfinished line, including incomplete ANSI escapes.
      inspect(pending, answered);
    });
  }
}
