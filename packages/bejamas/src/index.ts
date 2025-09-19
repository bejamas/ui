#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "module";
import { init } from "@/src/commands/init";
import { docs } from "@/src/commands/docs";
import { add } from "@/src/commands/add";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const program = new Command()
  .name("bejamas")
  .description("bejamas/ui cli")
  .configureHelp({
    helpWidth: Math.min(100, process.stdout.columns || 100),
  })
  .version(pkg.version, "-v, --version", "output the version number");

program.addCommand(init);
program.addCommand(add);
program.addCommand(docs);

program.parse(process.argv);

export default program;
