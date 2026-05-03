# bejamas

A CLI for adding components to your project.

## Usage

Use the `init` command to initialize dependencies for a new project.

The `init` command installs dependencies, adds the `cn` util, and configures CSS variables for the project.

Bejamas currently runs exact `shadcn` v4.6.0 for managed CLI commands. The Bejamas-specific `init` and `apply` flows preserve Astro preset switching, style support, and the legacy `--base-color` option.

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
```

You can also run the command without any arguments to view a list of all available components:

```bash
npx bejamas add
```

## apply

Use the `apply` command to switch an existing project to a new preset.

```bash
npx bejamas apply --preset <preset>
npx bejamas apply <preset> --only theme,font
```

## Documentation

Visit https://ui.bejamas.com/docs/cli to view the documentation.

## License

Licensed under the [MIT license](https://github.com/bejamas/ui/blob/main/LICENSE.md).
