---
title: Introduction
description: Astro-native UI components inspired by shadcn/ui.
sidebar:
  order: 1
---

`bejamas/ui` is a set of **Astro‑native components and blocks** inspired by shadcn/ui.

- Files are **copied into your repo** (no runtime dependency).
- **Zero‑JS by default**; add interactivity only when needed.
- Built with **Tailwind v4** and **design tokens**.
- **Docs generate from comments** in the component files.

If you use React, use **shadcn/ui**. If you build content‑heavy sites in **Astro**, use this.

## Why

There is no UI library that focuses on Astro components. There are plenty of React libraries, although you can use them in Astro, it's often overkill for content-heavy marketing websites, where performance is crucial.

We like shadcn’s copy‑and‑own approach. This brings the same idea to Astro:

- No React or hydration required
- Tokenized, utility‑first styling
- Copy, edit, and keep under version control
- Docs stay in sync with code

## Auto‑generated docs

Components contain structured comments. The docs site reads those and builds MDX pages.

Comment tags:

- `@component Button`
- `@description A component that renders a button`
- `@exampe`
- `@usage`
- `@examples`

## Composition

React libraries often use subcomponents (e.g. `<Card.Header>`). Astro doesn’t. We use **component part prop** instead.

**React style**

```jsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
</Card>
```

**Astro (parts)**

```astro
<Card>
  <Card part="header">
    <Card part="title">Title</Card>
    <Card part="description">Description</Card>
  </Card><!-- /header -->
</Card><!-- /root -->
```

We intentionally avoid components like `<CardTitle />`. Parts keep APIs simple and portable.

## Principles

1. **One file = one component.** Markup + variants + docs live together.
2. **Docs in code.** Comments power the docs; no duplication.
3. **Themeable.** Token‑based classes (e.g. `bg-background`, `text-primary`).
4. **Composable.** Primitives over abstractions; easy to read and modify.

## Use this when

- Building **marketing/docs/blog** sites in Astro
- You want **utility‑first**, slot‑based composition
- You prefer **copy‑paste ownership** over a library dependency
- You use **Tailwind** and token theming

## Consider alternatives when

- You’re building **app‑level UIs** that need complex interactions out of the box
- You’re using **React** (use shadcn/ui instead)
- You want a **versioned npm package** rather than vendored files
- You’re **not using Tailwind**
