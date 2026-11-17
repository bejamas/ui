import {
  getDocsIndex,
  getMarkdownSource,
  transformMarkdown,
} from "./docsMarkdown";

const SUMMARY =
  "bejamas/ui is an Astro-native component library built on Tailwind CSS v4. Components are copied into your project with the `bejamas` CLI, render as plain HTML on the server, and use small `@data-slot/*` scripts only where they need behavior.";

const NOTES = [
  "Every docs page is also available as Markdown: append `.md` to its URL.",
  "Add components with `npx bejamas add <name>`; they land in your project as editable `.astro` files.",
  "Components mark their parts with `data-slot` and expose state through `data-*` attributes (for example `data-state=\"open\"`), so style state with attribute selectors such as `data-[state=open]:`.",
  "Install the agent skill with `npx skills add bejamas/ui --skill bejamas-ui`.",
];

function toAbsolute(site: URL, route: string) {
  return new URL(route, site).href;
}

export function buildLlmsTxt(site: URL) {
  const sections = getDocsIndex().map(({ label, pages }) => {
    const links = pages.map(({ route, title, description }) => {
      const link = `- [${title}](${toAbsolute(site, `/${route}.md`)})`;
      return description ? `${link}: ${description}` : link;
    });

    return `## ${label}\n\n${links.join("\n")}`;
  });

  return [
    "# bejamas/ui",
    `> ${SUMMARY}`,
    NOTES.map((note) => `- ${note}`).join("\n"),
    ...sections,
    [
      "## Optional",
      "",
      `- [Full documentation](${toAbsolute(site, "/llms-full.txt")}): every page above in one file`,
      `- [Component registry](${toAbsolute(site, "/r/registry.json")}): machine-readable list of installable items`,
      "- [data-slot](https://data-slot.com): the headless behavior packages bejamas/ui components use",
    ].join("\n"),
  ].join("\n\n") + "\n";
}

export function buildLlmsFullTxt(site: URL) {
  const pages = getDocsIndex().flatMap(({ pages }) => pages);

  const bodies = pages.flatMap(({ route }) => {
    const source = getMarkdownSource(route);
    if (!source) return [];

    return [
      `<!-- Source: ${toAbsolute(site, `/${route}`)} -->\n\n${transformMarkdown(source)}`,
    ];
  });

  return [`# bejamas/ui\n\n> ${SUMMARY}`, ...bodies].join("\n\n---\n\n") + "\n";
}
