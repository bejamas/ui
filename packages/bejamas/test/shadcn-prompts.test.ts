import { expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { respondToShadcnPrompts } from "../src/utils/shadcn-prompts";

function fixture() {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  let answers = "";
  const unsupported: string[] = [];
  stdin.on("data", (chunk) => {
    answers += chunk.toString();
  });
  respondToShadcnPrompts(
    { stdin, stdout, stderr },
    {
      onUnsupportedPrompt: (message) => unsupported.push(message),
      unsupportedPromptDelayMs: 20,
    },
  );
  return {
    stdin,
    stdout,
    stderr,
    answers: () => answers,
    unsupported: () => unsupported,
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 60));

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

test("declines setup confirms that default to yes", async () => {
  const process = fixture();
  process.stdout.write(
    "\u001b[36m?\u001b[39m \u001b[1mYou need to create a \u001b[36mcomponents.json\u001b[39m file to add components. Proceed?\u001b[22m \u001b[90m›\u001b[39m \u001b[90m(Y/n)\u001b[39m",
  );
  expect(process.answers()).toBe("n\n");
  await settle();
  expect(process.unsupported()).toEqual([]);
});

test("waits for a confirm hint split into a later chunk", async () => {
  const process = fixture();
  process.stdout.write("? The file Button.astro already exists. Would you like to overwrite? ›");
  await new Promise((resolve) => setTimeout(resolve, 5));
  process.stdout.write(" (y/N)");
  expect(process.answers()).toBe("n\n");
  process.stdout.write(
    "\r✔ The file Button.astro already exists. Would you like to overwrite? … no\n",
  );
  await settle();
  expect(process.unsupported()).toEqual([]);
});

test("reports questions that cannot be declined, despite spinner output", async () => {
  const process = fixture();
  process.stdout.write(
    "? Which color would you like to use as the base color? › - Use arrow-keys. Return to submit.\n❯   Neutral\n    Gray",
  );
  for (let frame = 0; frame < 5; frame++) process.stderr.write("⠋ Checking registry.\r");
  expect(process.answers()).toBe("");
  await settle();
  expect(process.unsupported()).toEqual([
    "Which color would you like to use as the base color?",
  ]);
});
