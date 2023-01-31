---
title: QueryFailure.ts
nav_order: 6
parent: Modules
---

## QueryFailure overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [models](#models)
  - [QueryFailure (interface)](#queryfailure-interface)
- [refinements](#refinements)
  - [isQueryFailure](#isqueryfailure)
- [symbols](#symbols)
  - [QueryFailureTypeId](#queryfailuretypeid)
  - [QueryFailureTypeId (type alias)](#queryfailuretypeid-type-alias)

---

# constructors

## make

Constructs a new `QueryFailure` from the specified data source and request.

**Signature**

```ts
export declare const make: (
  dataSource: DataSource.DataSource<unknown, unknown>,
  request: Request.Request<unknown, unknown>
) => QueryFailure
```

Added in v1.0.0

# models

## QueryFailure (interface)

A `QueryFailure` keeps track of details relevant to query failures.

**Signature**

```ts
export interface QueryFailure {
  readonly [QueryFailureTypeId]: QueryFailureTypeId
  readonly _tag: 'QueryFailure'
  readonly dataSource: DataSource.DataSource<unknown, unknown>
  readonly request: Request.Request<unknown, unknown>
  message(): string
}
```

Added in v1.0.0

# refinements

## isQueryFailure

Returns `true` if the specified value is a `QueryFailure`, `false` otherwise.

**Signature**

```ts
export declare const isQueryFailure: (u: unknown) => u is QueryFailure
```

Added in v1.0.0

# symbols

## QueryFailureTypeId

**Signature**

```ts
export declare const QueryFailureTypeId: typeof QueryFailureTypeId
```

Added in v1.0.0

## QueryFailureTypeId (type alias)

**Signature**

```ts
export type QueryFailureTypeId = typeof QueryFailureTypeId
```

Added in v1.0.0
