---
title: Introduction
description: bejamas/ui is a set of Astro components built on top of Tailwind CSS v4.
sidebar:
  order: 1
---

`bejamas/ui` is an Astro-native UI component library built on Tailwind CSS v4.

Instead of a black-box dependency, it gives you copyable components that live in your codebase, follow your conventions, and evolve with your design system.

## Philosophy

`bejamas/ui` is inspired by the "copy the code, own the code" approach popularized by [shadcn/ui](https://ui.shadcn.com/docs), adapted for Astro and content-focused sites.

The library encourages minimal abstractions: components are mostly HTML, Astro, and Tailwind utilities. Styling and structure are always visible and editable, so you can start from sensible defaults and grow into a full design system without fighting an opaque API.

Even if you've never used shadcn/ui, the mental model stays simple: you copy a component into your project, make it yours, and keep it under version control alongside the rest of your code.

## Key Features

- **Astro-native** — Built for Astro from the ground up, not adapted from React.
- **Zero-JS by default** — Most components ship no client-side JavaScript.
- **Tailwind CSS v4** — Modern utility-first styling with CSS variables and theming support.
- **@data-slot for interactivity** — Interactive components use headless behavior primitives, so accessibility fixes ship as version bumps rather than requiring you to re-copy code. See [Design Principles](/docs/design-principles) for details.
- **30+ components** — Buttons, cards, dialogs, menus, forms, and more.

## Why bejamas/ui?

`bejamas/ui` is built for Astro projects that prioritize performance, content, and long-term maintainability. It's a strong fit for marketing sites, documentation, and content-heavy projects.

For agencies and teams, this approach supports a shared design language without enforcing a rigid framework. Copy components between projects, keep them in sync as needed, and adapt freely to each client's needs.

As your system grows, `bejamas/ui` components can serve as the foundation of a fully documented design system — readable, portable, and easy to extend.
