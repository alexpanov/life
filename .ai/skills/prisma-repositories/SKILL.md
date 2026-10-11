---
name: prisma-repositories
description: Set up Prisma and add a vendor-free Effect repository with a Prisma parser and Prisma implementation. Use when adding a table, a Prisma model, a repository, a select, a where, or a routine that reads or updates the database.
---

# Prisma repositories

Read `../../CONTRACT.md` relative to this file's directory. Domain types use the local Option. They never use `null` or `undefined`.

## Schema

Prisma 7. One CLI file, `prisma.config.ts`, points `schema` at the `prisma` directory. `prisma/schema.prisma` holds the generator and the datasource. One file per table in `prisma/models`. Prisma combines those files when it generates the client.

The client is constructed only in `packages/infrastructure/src/prisma.ts`. Pass that client into a repository layer. Do not export a shared static client.

`DATABASE_URL` is the server connection. It never ships in a browser or native build. Generate does not connect. A missing URL falls back to a local placeholder so generate still runs.

Supabase SQL migrations remain the scripts applied to development and live. When a model changes, update `prisma/models` and the matching SQL migration in the same change. The Prisma select then fails to compile if a query still names the old field.

## One folder per repository

```
packages/infrastructure/src/nico-repository/
  nico-repository.ts
  nico-repository-facade.ts
  nico-routine.ts
  nico-repository-parser-prisma.ts
  nico-repository-prisma.ts
```

Copy that shape for the next table. Replace `nico` with the domain name.

### Effect repository

`nico-repository.ts` exports the domain type, the typed error, and an Effect service. The service lists reads and simple updates, such as `byId` and `recordHeroName`. It imports nothing from Prisma. A domain value that might be missing is an Option.

### Facade

`nico-repository-facade.ts` exports `nicos`. `nicos.byId` and `nicos.recordHeroName` yield the Effect service. Routines call the facade. They do not call Prisma, and they do not call a static method.

### Routine

`nico-routine.ts` composes facade calls. It can read, then update. It sees domain types only.

### Parser

`nico-repository-parser-prisma.ts` owns the selects and the parse functions.

- Export a select object: `satisfies Prisma.NicoSelect`.
- Export the payload type: `Prisma.NicoGetPayload<{ select: typeof nicoSelect }>`.
- `parseNico` takes that payload type and returns `Either<string, Nico>`.
- Select every field the parser reads, and no owner filter. If the parser needs another field, add it to the select. The repository already passes that same select, so the find result type changes with it.
- Map database `null` to Option inside the parser.

### Prisma repository

`nico-repository-prisma.ts` owns the wheres. It calls `findUnique` or `update` with the parser's select and a where such as `nicoById(ownerId, id)`. The owner id is closed over when the layer is built, so one account cannot read another account's row through this adapter. Map a missing row to None. Map a failed parse to a corrupt repository error. Do not return `null`.

## Check

A renamed Prisma field must fail `tsc` on the select or on the parser, with no running database. Run `pnpm exec prisma generate` after a schema change, then `pnpm exec tsc --noEmit`.
