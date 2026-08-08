# `.ai/` — Rules for humans and AI agents

## Purpose

`.ai/` is the single source of truth for what this codebase does, how it's built, and why. It exists so that
both humans and AI coding agents can answer "what does this system do" and "where do I make this change"
without re-reading every source file from scratch. It documents the code **as it exists**, not as it's
planned to be — anything speculative belongs under an **Open questions** or **Known gaps & TODOs** section,
never stated as fact.

## Folder map

```
.ai/
├── INSTRUCTIONS.md          this file — rules for maintaining .ai/
├── PROJECT.md               product one-liner, repo layout, FE↔BE contract, local setup, env vars, glossary
├── PRODUCT_SPEC.md          condensed BRD/PRD reference — source for all `planned`-status features
├── FE/
│   ├── OVERVIEW.md          frontend purpose, stack, directory guide, run/build/test commands
│   ├── ARCHITECTURE.md      frontend layering, patterns, data flow, trade-offs
│   ├── FEATURES.md          index table of all frontend features
│   ├── CHANGELOG.md         Keep a Changelog format, frontend only
│   └── features/<slug>.md   one file per frontend feature
└── BE/
    ├── OVERVIEW.md          backend purpose, stack, directory guide, run/build/test commands
    ├── ARCHITECTURE.md      backend layering, patterns, data flow, trade-offs
    ├── FEATURES.md          index table of all backend features
    ├── API.md                every endpoint: method, path, auth, request/response, errors, source file
    ├── DATA_MODEL.md         entities, fields, relationships, indexes, Mermaid ER diagram
    ├── CHANGELOG.md          Keep a Changelog format, backend only
    └── features/<slug>.md   one file per backend feature
```

## Rule: read before you write code

Before writing code in an area of the FE or BE, read the matching `OVERVIEW.md`, `ARCHITECTURE.md`, and any
relevant `features/<slug>.md` file first. Don't guess at conventions — this repo's actual patterns are
documented there.

## Rule: docs update in the same commit as the code

Any code change that adds, modifies, or removes a feature must, in the same commit:

1. Update (or create) the matching `features/<slug>.md` file.
2. Add an entry to the matching project's `CHANGELOG.md` under `## [Unreleased]`.
3. Update `FEATURES.md` (status, or a new row) if the feature's status or existence changed.
4. Update `API.md` / `DATA_MODEL.md` (BE) if endpoints or schemas changed.

Docs that drift from the code are worse than no docs — treat a stale `.ai/` file as a bug.

## Naming conventions

- Feature slugs are kebab-case and match the filename: `features/lead-management.md`, not `LeadManagement.md`.
- One feature per file. If a feature grows large enough to need internal sections, that's fine — don't split
  it across multiple files.
- Status vocabulary (used in `FEATURES.md` tables and each feature file's header) is exactly one of:
  - `planned` — designed but no code written yet
  - `in-progress` — code exists but is incomplete or not wired end-to-end
  - `shipped` — code exists, is wired end-to-end, and works as documented
  - `deprecated` — still in the code but should not be extended or relied on

## Feature file template

```md
# <Feature name>
**Status:** shipped | **Last verified:** <date>

## Summary
## User-facing behaviour
## Key files
- `path/to/file.ts` — what it does
## Data / API touchpoints
## Dependencies
## Known gaps & TODOs
## Open questions
```

## Definition of done — adding a new feature

- [ ] Code is written and (if applicable) covered by tests.
- [ ] `features/<slug>.md` created using the template above, with real file paths.
- [ ] `FEATURES.md` row added with correct status.
- [ ] `CHANGELOG.md` entry added under `## [Unreleased]`.
- [ ] If BE: `API.md` updated with the new endpoint(s); `DATA_MODEL.md` updated if schemas changed.
- [ ] If FE: `ARCHITECTURE.md` updated if the change introduces a new pattern (new data-fetching approach,
      new state management, etc.) — otherwise skip.
- [ ] Anything unclear or undecided is written under **Open questions**, not guessed at.
