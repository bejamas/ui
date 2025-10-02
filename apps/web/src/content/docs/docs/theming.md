---
title: Theming
description: Why theming in bejamas/ui goes beyond colors.
sidebar:
  order: 3
---

In **bejamas/ui**, theming is about capturing the full range of a brand’s identity in a systemized way.  
A theme defines how a website looks, feels, and communicates — from the smallest tokens like colors and type scale, to broader elements like motion, imagery, and tone of voice.

For marketing websites, this matters because the theme isn’t just decoration.  
It’s the vehicle for brand expression. The right theme ensures that two websites built on the same system can feel completely different: one polished and corporate, another playful and expressive.

In other words, a theme is both **structure** and **expression**. It codifies the essentials that keep things cohesive, while leaving room for the creativity that makes each brand unique.

That balance is what we call the **spectrum of theming**.

---

## Theming as a Spectrum

![Theming spectrum diagram](/theming-spectrum.png)

On the left side of the spectrum are things that can be codified: colors, typography, spacing, radii, shadows, motion curves. These are precise, deterministic, and live inside your theme configuration.

As you move toward the right, things get looser. Style decisions like how rounded a button feels or how snappy a hover animation behaves are still systematic, but already start to say something about brand personality.

Further along, visuals like imagery, iconography, and illustration style are rarely “just tokens” — they live in design assets and change from campaign to campaign.

And on the far right, you get into voice and tone.

That’s the language of your brand: the difference between a button that says “Get Started” and one that says “Let’s Jam 🚀.”

The bottom line: some parts of a theme are code, others are examples. Both matter.

---

## A Component in Practice

To make the spectrum tangible, let’s look at a simple button.

At the token level, it’s just blue with white text, 14px type, and an 8px radius.

Style brings in shape, motion, and elevation — maybe a pill shape with a soft hover shadow.

Visuals add expression: a gradient background, a custom icon, maybe even a doodle next to the CTA.

And finally, tone changes the message: “Apply Now” becomes “Let’s Jam 🚀.”

The same button evolves from a coded component into a branded expression.

---

## Implementation in bejamas/ui

This spectrum has practical consequences. On one side, we provide a codified theme (`globals.css`) with tokens and styles. These are enforced across components, ensuring consistency and scalability.

On the other side, we provide blocks, templates, and examples that show how visuals and tone come together in practice.

Developers get a reliable foundation. Designers and marketers get expressive levers. And brands get the best of both worlds: a system that scales, without sacrificing uniqueness.

---

## Closing

A theme in **bejamas/ui** is both systematic and expressive.

By codifying what can be automated, and guiding what must be designed, we ensure that marketing websites scale without losing their unique identity.
