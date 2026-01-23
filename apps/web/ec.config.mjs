import { pluginCollapsible } from "expressive-code-collapsible";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";

const config = {
  plugins: [
    pluginCollapsible({
      previewLines: 4,
      lineThreshold: 8,
      expandButtonText: "View Code",
      collapseButtonText: "Hide Code",
    }),
    pluginLineNumbers(),
  ],
};

export default config;
