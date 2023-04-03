---
title: CompletedRequestMap.ts
nav_order: 2
parent: Modules
---

## CompletedRequestMap overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [combine](#combine)
  - [set](#set)
  - [setOption](#setoption)
- [constructors](#constructors)
  - [empty](#empty)
  - [make](#make)
- [context](#context)
  - [CompletedRequestMap](#completedrequestmap)
- [elements](#elements)
  - [get](#get)
  - [has](#has)
  - [requests](#requests)
- [models](#models)
  - [CompletedRequestMap (interface)](#completedrequestmap-interface)
- [symbols](#symbols)
  - [CompletedRequestMapTypeId](#completedrequestmaptypeid)
  - [CompletedRequestMapTypeId (type alias)](#completedrequestmaptypeid-type-alias)

---

# combinators

## combine

Combines two completed request maps into a single completed request map.

**Signature**

```ts
export declare const combine: {
  (that: CompletedRequestMap): (self: CompletedRequestMap) => CompletedRequestMap
  (self: CompletedRequestMap, that: CompletedRequestMap): CompletedRequestMap
}
```

Added in v1.0.0

## set

Appends the specified result to the completed requests map.

**Signature**

```ts
export declare const set: {
  <A extends Request.Request<any, any>>(request: A, result: Request.Request.Result<A>): (
    self: CompletedRequestMap
  ) => void
  <A extends Request.Request<any, any>>(self: CompletedRequestMap, request: A, result: Request.Request.Result<A>): void
}
```

Added in v1.0.0

## setOption

Appends the specified optional result to the completed request map.

**Signature**

```ts
export declare const setOption: {
  <A extends Request.Request<any, any>>(request: A, result: Request.Request.OptionalResult<A>): (
    self: CompletedRequestMap
  ) => void
  <A extends Request.Request<any, any>>(
    self: CompletedRequestMap,
    request: A,
    result: Request.Request.OptionalResult<A>
  ): void
}
```

Added in v1.0.0

# constructors

## empty

An empty completed requests map.

**Signature**

```ts
export declare const empty: () => CompletedRequestMap
```

Added in v1.0.0

## make

Constructs a new completed requests map with the specified request and
result.

**Signature**

```ts
export declare const make: <E, A>(request: Request.Request<E, A>, result: Either.Either<E, A>) => CompletedRequestMap
```

Added in v1.0.0

# context

## CompletedRequestMap

The context tag for a `CompletedRequestMap`.

**Signature**

```ts
export declare const CompletedRequestMap: Context.Tag<CompletedRequestMap, CompletedRequestMap>
```

Added in v1.0.0

# elements

## get

Retrieves the result of the specified request if it exists.

**Signature**

```ts
export declare const get: {
  <A extends Request.Request<any, any>>(request: A): (
    self: CompletedRequestMap
  ) => Option.Option<Request.Request.Result<A>>
  <A extends Request.Request<any, any>>(self: CompletedRequestMap, request: A): Option.Option<Request.Request.Result<A>>
}
```

Added in v1.0.0

## has

Returns whether a result exists for the specified request.

**Signature**

```ts
export declare const has: {
  <A extends Request.Request<any, any>>(request: A): (self: CompletedRequestMap) => boolean
  <A extends Request.Request<any, any>>(self: CompletedRequestMap, request: A): boolean
}
```

Added in v1.0.0

## requests

Collects all requests in a set.

**Signature**

```ts
export declare const requests: (self: CompletedRequestMap) => HashSet.HashSet<Request.Request<unknown, unknown>>
```

Added in v1.0.0

# models

## CompletedRequestMap (interface)

A `CompletedRequestMap` is a universally quantified mapping from requests of
type `Request<E, A>` to results of type `Either<E, A>` for all types `E` and
`A`. The guarantee is that for any request of type `Request<E, A>`, if there
is a corresponding value in the map, that value is of type `Either<E, A>`.
This is used by the library to support data sources that return different
result types for different requests while guaranteeing that results will be
of the type requested.

**Signature**

```ts
export interface CompletedRequestMap extends CompletedRequestMap.Proto {
  /** @internal */
  readonly map: MutableRef.MutableRef<
    HashMap.HashMap<Request.Request<unknown, unknown>, Either.Either<unknown, unknown>>
  >
}
```

Added in v1.0.0

# symbols

## CompletedRequestMapTypeId

**Signature**

```ts
export declare const CompletedRequestMapTypeId: typeof CompletedRequestMapTypeId
```

Added in v1.0.0

## CompletedRequestMapTypeId (type alias)

**Signature**

```ts
export type CompletedRequestMapTypeId = typeof CompletedRequestMapTypeId
```

Added in v1.0.0
