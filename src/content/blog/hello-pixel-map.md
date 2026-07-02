---
title: "Building a Personal Pixel Map"
slug: "hello-pixel-map"
date: "2026-06-29"
summary: "Why this site starts as a map instead of a normal blog index, and how the content model stays simple."
tags: ["meta", "design", "nextjs"]
category: "Design Log"
published: true
---

## The map is the interface

Most personal sites begin with a list: latest posts, latest projects, latest links. Pixel-Map begins with a place. The map gives each section a small identity, so a reader can remember the site as a world instead of a menu.

## Content stays boring on purpose

The presentation can be playful while the publishing system remains plain Markdown. That makes it easy to write, review, version, and eventually migrate.

- Blog posts live in `src/content/blog`.
- News signals live in `src/content/news`.
- Project profiles live in `src/content/projects`.

## What comes next

The first version focuses on rhythm: a memorable homepage, readable article pages, and content modules that can grow without a rewrite.
