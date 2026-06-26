# Maizzle Agent Skill

This directory contains an Agent Skill for building production-ready HTML emails with Vue components and Tailwind CSS 4 in Maizzle 6.

## Structure

```
├── SKILL.md              # Main skill instructions
└── references/
    ├── COMPONENTS.md     # Full component props and usage examples
    ├── COMPOSABLES.md    # Vue composables for use in <script setup>
    ├── CONFIGURATION.md  # Config options, transformers, and build settings
    ├── PATTERNS.md       # Common email patterns and recipes
    ├── STYLING.md        # Advanced CSS pipeline and Tailwind configuration
    └── TRANSFORMERS.md   # HTML and CSS transformers reference
```

## What is an Agent Skill?

An Agent Skill is a domain expertise package that AI coding agents can load on demand. With this skill, agents learn to:

- Build HTML email templates using Maizzle's Vue-based components
- Style emails with Tailwind CSS 4, including responsive breakpoints and dark mode
- Configure the build pipeline — CSS inlining, purging, shorthand optimization
- Handle static assets, URL rewriting, and UTM tracking
- Work with the Maizzle CLI for scaffolding and building projects
- Follow email client compatibility best practices

## How It Works

The skill is built on the [Agent Skills specification](https://agentskills.io). When activated, the agent reads `SKILL.md` for core Maizzle knowledge — components, styling, configuration, and email best practices. Reference files in `references/` provide deeper detail and are consulted as needed during a task.

## Progressive disclosure

The skill is structured for efficient context usage, following the [Agent Skills specification](https://agentskills.io/specification.md):

1. **Metadata** (~100 tokens) — the `name` and `description` frontmatter fields are loaded at startup for all skills
2. **Instructions** (~5000 tokens) — the full `SKILL.md` body is loaded when the skill activates, covering components, styling, configuration, and email best practices
3. **References** (as needed) — files in `references/` are loaded only when the agent needs deeper detail like component props, transformer options, or advanced CSS configuration

## Learn More

- [Maizzle Documentation](https://maizzle.com/docs)
- [Agent Skills Specification](https://agentskills.io/specification.md)
- [Maizzle GitHub](https://github.com/maizzle/framework)
