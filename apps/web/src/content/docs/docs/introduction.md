---
title: Introduction
description: bejamas/ui is a set of Astro components built on top of Tailwind CSS v4.
sidebar:
  order: 1
---

`bejamas/ui` is an Astro-native UI component library built on Tailwind CSS v4.  
Instead of a black-box dependency, it gives you copyable components that live in your codebase, follow your conventions, and evolve with your design system.

## Philosophy

`bejamas/ui` is inspired by the “copy the code, own the code” approach popularized by [shadcn/ui](https://ui.shadcn.com/docs), adapted for Astro and zero-JS, content-focused sites.

The library encourages minimal abstractions: components are mostly HTML, Astro, and Tailwind utilities. Styling and structure are always visible and editable, so you can start from sensible defaults and grow into a full design system without fighting an opaque API.

Even if you’ve never used shadcn/ui, the mental model stays simple: you copy a component into your project, make it yours, and keep it under version control alongside the rest of your code.

## Single-File, AI-Ready Components

Each `bejamas/ui` component is designed as a single, self-contained `.astro` file that brings together markup, styles, variants, metadata, and examples.

This structure makes components easy to reason about for both humans and AI tools. When everything lives in one place, it’s straightforward to:

- understand how a component works at a glance,
- refactor markup or Tailwind classes safely,
- align components with your design tokens and layout patterns,
- generate or update documentation from the source.

There are no hidden helpers or fragmented configuration files to track down — what you see in the component file is what you ship.

## Why `bejamas/ui`?

`bejamas/ui` is tailored for Astro projects that care about performance, content, and long-term maintainability.

It is Astro-native and zero-JS by default, making it a strong fit for marketing sites, documentation, and content-heavy projects. Tailwind CSS v4 provides the utility layer, while `bejamas/ui` supplies opinionated but flexible building blocks you can reuse across brands and repositories.

For agencies and teams, this approach supports a shared design language without enforcing a rigid framework: you can copy components between projects, keep them in sync as needed, and still adapt them freely to each client’s needs.

As your system grows, `bejamas/ui` components can serve as the foundation of a fully documented design system, with source-of-truth code that remains readable, portable, and easy to extend.
