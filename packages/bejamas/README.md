# bejamas

A CLI for adding components to your project.

## Usage

Use the `init` command to initialize dependencies for a new project.

The `init` command installs dependencies, adds the `cn` util, and configures CSS variables for the project.

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
npx shadcn add button
```

You can also run the command without any arguments to view a list of all available components:

```bash
npx shadcn add
```

## Documentation

Visit https://ui.bejamas.com/docs/cli to view the documentation.

## License

Licensed under the [MIT license](https://github.com/bejamas/ui/blob/main/LICENSE.md).
