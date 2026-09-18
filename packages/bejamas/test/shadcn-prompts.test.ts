import { expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { respondToShadcnPrompts } from "../src/utils/shadcn-prompts";

function fixture() {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  let answers = "";
  stdin.on("data", (chunk) => {
    answers += chunk.toString();
  });
  respondToShadcnPrompts({ stdin, stdout, stderr });
  return { stdin, stdout, stderr, answers: () => answers };
}

function prompt(filename: string) {
  return `\u001b[36m?\u001b[39m The file \u001b[1m${filename}\u001b[22m already exists. Would you like to overwrite? › \u001b[90m(y/N)\u001b[39m`;
}

test("answers an overwrite exactly once across every possible byte split", () => {
  const bytes = Buffer.from(prompt("Résumé.astro"));
  for (let split = 1; split < bytes.length; split++) {
    const process = fixture();
    process.stdout.write(bytes.subarray(0, split));
    process.stdout.write(bytes.subarray(split));
    expect(process.answers()).toBe("n\n");
  }
});

test("handles redraws and multiple questions without duplicate answers", () => {
  const process = fixture();
  process.stdout.write(prompt("Button.astro"));
  process.stdout.write(`\r\u001b[2K${prompt("Button.astro")}\n`);
  process.stdout.write(`${prompt("Card.astro")}\n${prompt("Footer.astro")}`);
  expect(process.answers()).toBe("n\nn\nn\n");
});

test("answers separate questions about the same basename", () => {
  const process = fixture();
  process.stdout.write(prompt("index.ts"));
  process.stdout.write(
    "\r\u001b[2K✔ The file index.ts already exists. Would you like to overwrite? … no\n",
  );
  process.stdout.write(prompt("index.ts"));
  expect(process.answers()).toBe("n\nn\n");
});

test("keeps streams separate and recognizes fragmented summaries", () => {
  for (const summary of [
    "Created 2 files:",
    "Updated 1 file:",
    "Skipped 3 files:",
    "No files updated.",
  ]) {
    const bytes = Buffer.from(`\u001b[32m✔\u001b[39m ${summary}\n`);
    for (let split = 1; split < bytes.length; split++) {
      const process = fixture();
      process.stdout.write(prompt("Button.astro"));
      process.stderr.write(bytes.subarray(0, split));
      process.stdout.write("\n  - src/ui/Button.astro\n");
      process.stderr.write(bytes.subarray(split));
      expect(process.stdin.writableEnded).toBe(true);
      process.stdout.write(prompt("Ignored.astro"));
      expect(process.answers()).toBe("n\n");
    }
  }
});

test("does not answer unrelated output or close stdin during installation", () => {
  const process = fixture();
  process.stdout.write("- Updating files.\n  - src/ui/button/Button.astro\n");
  process.stderr.write("- Checking registry.\n(y/N)\n");
  expect(process.answers()).toBe("");
  expect(process.stdin.writableEnded).toBe(false);
  process.stdin.destroy();
  process.stdout.write(prompt("Button.astro"));
  expect(process.answers()).toBe("");
});
