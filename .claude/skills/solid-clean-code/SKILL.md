---
name: solid-clean-code
description: Use when writing, changing or reviewing any production code in this project (engine, Edge Functions, Supabase adapters, data layer, screens), including under time pressure or when "just a quick function" is asked
---

# SOLID, TDD, clean code and design patterns

## Overview

Production code here is built test-first, in layers whose dependencies point inward, with names and types that make the code its own documentation. **Violating the letter of these rules is violating their spirit.**

**REQUIRED SUB-SKILL:** superpowers:test-driven-development — no production line without a failing test first.

## Rule 0 — read the real contracts before writing

Open the actual module, table or type you depend on (`src/engine/*`, migrations, seed JSON). Never write `// ASSUMPTIONS: shape = ...` and code against a guess. Unknown shape → read it or ask. Guessed shapes cause silent data corruption at the boundary. Contract not written yet (e.g. no migration) → write it first, as the first step of the task, then code against it.

## Layers (dependencies point inward)

| Layer | Here | May depend on |
|---|---|---|
| Domain | `src/engine/*` — pure, deterministic, no I/O | nothing |
| Application | use cases / handlers: orchestrate domain + ports | domain, port interfaces |
| Adapters | Supabase repositories, row↔domain mappers, AI extractor | application ports, SDKs |
| Entry points | Edge `index.ts`, screens, admin pages | wiring only |

- Domain code is **shared, never copied**. One source (`src/engine`), imported by app and functions.
- Entry points only wire dependencies (composition root). No logic there.
- Clock, RNG, IDs, DB, network are injected ports, never called directly from domain or use cases.

## SOLID, applied

- **S** — one reason to change per module: mapping, persistence, validation and orchestration are separate units.
- **O** — extend by registration (trigger/reward registries, extractor per source), not by editing a growing `switch`.
- **L** — every fake/adapter honours the port contract exactly (same errors, same shapes).
- **I** — small ports: `CatalogReader`, `WalletRepository`, `PackLedger`; not one `store` that loads everything.
- **D** — use cases depend on ports; adapters implement them.

## Clean code

- Intention-revealing names: `wallet`, `ownedRows`, `packDate` — never `w`, `o`, `x`, `c`, `d`.
- No `any` / untyped blobs at boundaries: TS types or JSDoc typedefs for domain objects, rows and ports.
- Functions do one thing, ~20 lines max; no flag arguments; no magic values (named constants or `balance`).
- Errors are explicit domain results or typed errors; never swallow (`catch { console.error }` then continue).
- Business rules decided once, in one place (e.g. "today" = server date in the configured timezone, computed by one function).
- Multi-table writes are atomic: one Postgres function (RPC) per use case; no compensating deletes.

## Design patterns — use when they remove a real problem

| Problem | Pattern |
|---|---|
| DB rows ≠ domain objects | Mapper (pure, unit-tested both ways) |
| Persistence behind use cases | Repository + port interface |
| Variant behaviour (triggers, rewards, PDF sources) | Strategy + registry |
| Wiring prod vs test vs demo | Dependency injection / composition root |
| One API, two backends (`demo`, `supabase`) | Adapter behind one interface |
| Several writes must succeed together | Transaction script in a Postgres RPC |

YAGNI: no pattern without a current second use or a test-seam need.

## Testing rules

- Order: failing test → minimal code → refactor. Tests written after code are deleted and rewritten first.
- Test **behaviour and state**, with in-memory fakes implementing the ports. Don't assert call order of mocks.
- Mappers and adapters get their own tests (adapters against local Supabase). The boundary is where bugs live.
- Every bug fix starts with a test reproducing it.

## Red flags — stop and fix before continuing

- "ASSUMPTIONS:" comment, or a shape you didn't read
- Copying engine code into another folder
- `any`, one-letter names, a function > ~30 lines
- Logic in `index.ts` / a screen
- A port with more than ~4 methods or unrelated methods
- Tests appended after the implementation, or only the happy path of the handler tested
- Several sequential writes without a transaction

## Rationalizations

| Excuse | Reality |
|---|---|
| "User is waiting / it's late" | Rework after a data bug costs far more. The rules are the fast path. |
| "Adjust the mapping if it differs" | You can read it now. Guessing ships corrupt data. |
| "Copy the engine to `_shared` for now" | Two engines diverge; scores differ between app and server. |
| "Atomicity later via RPC" | Later never comes; write the RPC now. |
| "Handler tests cover it" | Mocked handler tests skip the mapper, where the bug is. |
