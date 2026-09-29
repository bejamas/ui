import { StringDecoder } from "node:string_decoder";
import type { Readable, Writable } from "node:stream";
import { stripVTControlCharacters } from "node:util";

// prompts renders a question as `? <message> › <input or hint>`.
const QUESTION_PATTERN = /(?:^|\s)\?\s+([^\r\n]+?)\s+›/g;
// Confirm questions only render in full once the `(y/N)` hint is written.
const CONFIRM_PATTERN = /(?:^|\s)\?\s+([^\r\n]+?)\s+›\s*\((?:y\/N|Y\/n)\)/g;
const SUMMARY_PATTERN = /(?:Created|Updated|Skipped)\s+\d+\s+file|No files updated/i;

export interface ShadcnPromptOptions {
  /**
   * Called for a question that cannot be declined with "n", such as a select or
   * text prompt. shadcn would otherwise wait on stdin forever.
   */
  onUnsupportedPrompt?: (message: string) => void;
  /** How long a question must stay unanswered before it counts as unsupported. */
  unsupportedPromptDelayMs?: number;
}

/**
 * Decline every confirm question (overwrites, setup offers), then close stdin
 * when shadcn finishes its file phase. Any other question is reported through
 * `onUnsupportedPrompt` instead of being left to hang.
 */
export function respondToShadcnPrompts(
  subprocess: {
    stdin: Writable | null;
    stdout: Readable | null;
    stderr: Readable | null;
  },
  {
    onUnsupportedPrompt,
    unsupportedPromptDelayMs = 250,
  }: ShadcnPromptOptions = {},
) {
  let unsupportedTimer: ReturnType<typeof setTimeout> | undefined;
  let waitingOn: string | undefined;
  let reported = false;

  function clearUnsupportedTimer() {
    if (unsupportedTimer) clearTimeout(unsupportedTimer);
    unsupportedTimer = undefined;
    waitingOn = undefined;
  }

  function inspect(line: string, answered: Set<string>) {
    const text = stripVTControlCharacters(line);
    const stdin = subprocess.stdin;
    const canAnswer = stdin && !stdin.destroyed && !stdin.writableEnded;

    // A prompt has no trailing newline. Match the entire question so redraws
    // can be recognized without treating another file's prompt as a duplicate.
    if (canAnswer) {
      for (const match of text.matchAll(CONFIRM_PATTERN)) {
        const message = match[1];
        if (answered.has(message)) continue;
        answered.add(message);
        stdin.write("n\n");
        if (message === waitingOn) clearUnsupportedTimer();
      }
    }

    const unanswered = Array.from(
      text.matchAll(QUESTION_PATTERN),
      (match) => match[1],
    ).filter((message) => !answered.has(message));
    const message = unanswered.at(-1);
    if (message && message !== waitingOn && onUnsupportedPrompt && !reported) {
      // A confirm question may still be missing its `(y/N)` hint; give it time
      // to finish rendering before treating it as unanswerable.
      clearUnsupportedTimer();
      waitingOn = message;
      unsupportedTimer = setTimeout(() => {
        reported = true;
        onUnsupportedPrompt(message);
      }, unsupportedPromptDelayMs);
      unsupportedTimer.unref?.();
    }

    // After prompts, shadcn otherwise keeps reading the open stdin pipe.
    if (canAnswer && SUMMARY_PATTERN.test(text)) {
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
    stream?.on("end", clearUnsupportedTimer);
  }
}
