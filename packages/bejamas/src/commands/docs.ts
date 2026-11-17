import { Command, Option } from "commander";
import { buildUiUrl } from "@/src/utils/ui-base-url";

export interface ComponentDocsResult {
  component: string;
  links: {
    docs: string;
    markdown: string;
  };
  content?: string;
  error?: string;
}

function normalizeComponentName(component: string) {
  return component
    .trim()
    .replace(/^@bejamas\//, "")
    .toLowerCase();
}

export async function fetchComponentDocs(
  component: string,
  {
    env = process.env,
    fetchImpl = fetch,
  }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {},
): Promise<ComponentDocsResult> {
  const name = normalizeComponentName(component);
  const docs = buildUiUrl(`/components/${name}`, env);
  const markdown = `${docs}.md`;
  const result: ComponentDocsResult = {
    component: name,
    links: { docs, markdown },
  };

  try {
    const response = await fetchImpl(markdown);

    if (!response.ok) {
      return {
        ...result,
        error:
          response.status === 404
            ? `No docs found for "${name}". See ${buildUiUrl("/llms.txt", env)} for the component list.`
            : `Failed to fetch ${markdown}: ${response.status}`,
      };
    }

    return { ...result, content: await response.text() };
  } catch (error) {
    return {
      ...result,
      error: `Failed to fetch ${markdown}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export const docs = new Command()
  .name("docs")
  .description("print the bejamas/ui docs for components as markdown")
  .argument("<components...>", "component names")
  .option("--json", "output as JSON.", false)
  // Kept so scripts written for the old shadcn proxy don't fail on them.
  .addOption(new Option("-c, --cwd <cwd>").hideHelp())
  .addOption(new Option("-b, --base <base>").hideHelp())
  .action(async (components: string[], opts: { json?: boolean }) => {
    const results = await Promise.all(
      components.map((component) => fetchComponentDocs(component)),
    );
    const failed = results.some((result) => result.error);

    if (opts.json) {
      process.stdout.write(`${JSON.stringify({ results }, null, 2)}\n`);
    } else {
      for (const result of results) {
        if (result.error) {
          process.stderr.write(`${result.error}\n`);
          continue;
        }

        process.stdout.write(
          `${result.content?.trimEnd()}\n\nSource: ${result.links.docs}\n\n`,
        );
      }
    }

    if (failed) {
      process.exitCode = 1;
    }
  });
