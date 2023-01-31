---
title: Described.ts
nav_order: 4
parent: Modules
---

## Described overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [models](#models)
  - [Described (interface)](#described-interface)
- [symbols](#symbols)
  - [DescribedTypeId](#describedtypeid)
  - [DescribedTypeId (type alias)](#describedtypeid-type-alias)

---

# constructors

## make

Constructs a new `Described<A>` from a value and a description.

**Signature**

```ts
export declare const make: <A>(value: A, description: string) => Described<A>
```

Added in v1.0.0

# models

## Described (interface)

A `Described<A>` is a value of type `A` along with a string description of
that value. The description may be used to generate a hash associated with
the value, so values that are equal should have the same description and
values that are not equal should have different descriptions.

**Signature**

```ts
export interface Described<A> extends Described.Proto {
  readonly value: A
  readonly description: string
}
```

Added in v1.0.0

# symbols

## DescribedTypeId

**Signature**

```ts
export declare const DescribedTypeId: typeof DescribedTypeId
```

Added in v1.0.0

## DescribedTypeId (type alias)

**Signature**

```ts
export type DescribedTypeId = typeof DescribedTypeId
```

Added in v1.0.0
