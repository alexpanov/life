---
name: quest-functional-core
description: Build or refactor QuestOS TypeScript domain logic, Effect routines, repositories, save codecs and adapters. Use for quest transitions, persistence, model integration or architecture changes. When input crosses a boundary, also load parse-dont-validate.
---

# Functional core

Read `../../CONTRACT.md` relative to this file's directory. Inspect the existing domain types, command union, effects and test scripts before adding abstractions.

1. State the invariant and input/output types first. Represent optional values with the local Option and expected alternatives with Either; compose asynchronous work and typed failures with Effect. Avoid `any`, unchecked assertions and broad exception swallowing.
2. Keep transitions deterministic and independent of React or providers. Pass time, IDs and other nondeterminism explicitly. Treat input snapshots as immutable; confine any draft mutation to a private transition boundary. Return the resulting state and explicit outcomes.
3. Name read contracts repositories and write operations routines. Keep persistence, network and model implementations outside the core. Map provider failures into typed errors, and preserve useful diagnostics without secrets. When the storage vendor is Prisma, follow [prisma-repositories](../prisma-repositories/SKILL.md).
4. Parse unknown external data at a boundary. Do not return raw `null` or `undefined` from core/application APIs. Convert platform or wire-format absence immediately to Option. Keep necessary legacy JSON null encoding isolated in the codec; do not relax lint across the domain for it. This line is the short version. TypeScript will not nag you when a check returns `boolean` and the type stays the same. Load [parse-dont-validate](../parse-dont-validate/SKILL.md) whenever a save, a payload, or model output comes in the door.
5. Preserve IDs, progress, rewards, sidekick memory and existing save keys through migration. Reject invalid imports atomically. Keep corruption recovery and reset behavior explicit. Never overwrite a recoverable save just because parsing failed.
6. Add focused tests for the invariant, failure path and adapter contract. The test file sits next to the code it tests. For transitions, assert identical inputs produce identical outputs, input state remains unchanged, and replay cannot award unintended duplicate rewards. Run the affected tests and typecheck.

Keep UI event handlers thin: collect intent, call a routine, render its result. Do not calculate rewards, learn preferences or decide quest priority inside a component. Extend the existing stable vocabulary before inventing new layers.
