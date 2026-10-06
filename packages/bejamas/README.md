# bejamas

A CLI for adding components to your project.

## Usage

Use the `init` command to initialize dependencies for a new project.

The `init` command installs dependencies, adds the `cn` util, and configures CSS variables for the project.

Bejamas currently runs exact `shadcn` v4.6.0 for managed CLI commands. The Bejamas-specific `init`, `apply`, and `preset` flows preserve Astro preset switching, style support, and the legacy `--base-color` option.

```bash
npx bejamas init
```

## add

Use the `add` command to add components to your project.

The `add` command adds a component to your project and installs all required dependencies.

```bash
npx bejamas add [component]
```

### Example

```bash
npx bejamas add button
npx bejamas add navigation-headers-01
npx bejamas add @bejamas/footer-01
```

Blocks are installed under `src/components/blocks/<block-id>` together with
their required UI components. In a monorepo, run the command from the app so
the block lands in the app while its UI dependencies go to the shared UI
package.

You can also run the command without any arguments to view a list of all available components and blocks:

```bash
npx bejamas add
```

## Shadcnblocks Astro ports

Install the migrated Astro blocks with the project's selected Bejamas style:

```bash
bunx bejamas@latest add @shadcnblocks/features-02
```

Bejamas resolves `@shadcnblocks` to its own registry of Astro ports. This works without a registry entry, including in older projects that still map the namespace to the upstream React registry. Use migrated names such as `hero-01` and `features-02`, rather than upstream names such as `hero1` and `feature13`.

Starter templates include this mapping in `components.json`:

```json
{
  "registries": {
    "@shadcnblocks": "https://ui.bejamas.com/r/shadcnblocks/styles/{style}/{name}.json"
  }
}
```

The dedicated registry contains the migrated blocks; their UI and style dependencies come from the main Bejamas registry. Bare names and `@bejamas/<name>` remain available as compatibility aliases. Other external namespaces follow their configured registry mappings.

## apply

Use the `apply` command to switch an existing project to a new preset.

```bash
npx bejamas apply --preset <preset>
npx bejamas apply <preset> --only theme,font
```

## preset

Use the `preset` command to decode preset codes, create share URLs, open presets in the builder, or resolve the active preset from an existing project.

```bash
npx bejamas preset decode <preset>
npx bejamas preset url <preset>
npx bejamas preset resolve
```

## Documentation

Visit https://ui.bejamas.com/docs/cli to view the documentation.

## License

Licensed under the [MIT license](https://github.com/bejamas/ui/blob/main/LICENSE.md).
