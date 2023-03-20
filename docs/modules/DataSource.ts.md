---
title: DataSource.ts
nav_order: 3
parent: Modules
---

## DataSource overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [around](#around)
  - [batchN](#batchn)
  - [contramap](#contramap)
  - [contramapEffect](#contramapeffect)
  - [eitherWith](#eitherwith)
  - [race](#race)
- [constructors](#constructors)
  - [fromFunction](#fromfunction)
  - [fromFunctionBatched](#fromfunctionbatched)
  - [fromFunctionBatchedEffect](#fromfunctionbatchedeffect)
  - [fromFunctionBatchedOption](#fromfunctionbatchedoption)
  - [fromFunctionBatchedOptionEffect](#fromfunctionbatchedoptioneffect)
  - [fromFunctionBatchedWith](#fromfunctionbatchedwith)
  - [fromFunctionBatchedWithEffect](#fromfunctionbatchedwitheffect)
  - [fromFunctionEffect](#fromfunctioneffect)
  - [fromFunctionOption](#fromfunctionoption)
  - [fromFunctionOptionEffect](#fromfunctionoptioneffect)
  - [make](#make)
  - [makeBatched](#makebatched)
  - [never](#never)
- [context](#context)
  - [contramapContext](#contramapcontext)
  - [provideContext](#providecontext)
- [models](#models)
  - [DataSource (interface)](#datasource-interface)
- [refinements](#refinements)
  - [isDataSource](#isdatasource)
- [symbols](#symbols)
  - [DataSourceTypeId](#datasourcetypeid)
  - [DataSourceTypeId (type alias)](#datasourcetypeid-type-alias)

---

# combinators

## around

A data source aspect that executes requests between two effects, `before`
and `after`, where the result of `before` can be used by `after`.

**Signature**

```ts
export declare const around: {
  <R2, A2, R3, _>(
    before: Described.Described<Effect.Effect<R2, never, A2>>,
    after: Described.Described<(a: A2) => Effect.Effect<R3, never, _>>
  ): <R, A>(self: DataSource<R, A>) => DataSource<R2 | R3 | R, A>
  <R, A, R2, A2, R3, _>(
    self: DataSource<R, A>,
    before: Described.Described<Effect.Effect<R2, never, A2>>,
    after: Described.Described<(a: A2) => Effect.Effect<R3, never, _>>
  ): DataSource<R | R2 | R3, A>
}
```

Added in v1.0.0

## batchN

Returns a data source that executes at most `n` requests in parallel.

**Signature**

```ts
export declare const batchN: {
  (n: number): <R, A>(self: DataSource<R, A>) => DataSource<R, A>
  <R, A>(self: DataSource<R, A>, n: number): DataSource<R, A>
}
```

Added in v1.0.0

## contramap

Returns a new data source that executes requests of type `B` using the
specified function to transform `B` requests into requests that this data
source can execute.

**Signature**

```ts
export declare const contramap: {
  <A extends Request.Request<any, any>, B extends Request.Request<any, any>>(f: Described.Described<(_: B) => A>): <R>(
    self: DataSource<R, A>
  ) => DataSource<R, B>
  <R, A extends Request.Request<any, any>, B extends Request.Request<any, any>>(
    self: DataSource<R, A>,
    f: Described.Described<(_: B) => A>
  ): DataSource<R, B>
}
```

Added in v1.0.0

## contramapEffect

Returns a new data source that executes requests of type `B` using the
specified effectual function to transform `B` requests into requests that
this data source can execute.

**Signature**

```ts
export declare const contramapEffect: {
  <A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>>(
    f: Described.Described<(_: B) => Effect.Effect<R2, never, A>>
  ): <R>(self: DataSource<R, A>) => DataSource<R2 | R, B>
  <R, A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>>(
    self: DataSource<R, A>,
    f: Described.Described<(_: B) => Effect.Effect<R2, never, A>>
  ): DataSource<R | R2, B>
}
```

Added in v1.0.0

## eitherWith

Returns a new data source that executes requests of type `C` using the
specified function to transform `C` requests into requests that either this
data source or that data source can execute.

**Signature**

```ts
export declare const eitherWith: {
  <A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>, C extends Request.Request<any, any>>(
    that: DataSource<R2, B>,
    f: Described.Described<(_: C) => Either.Either<A, B>>
  ): <R>(self: DataSource<R, A>) => DataSource<R2 | R, C>
  <
    R,
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    self: DataSource<R, A>,
    that: DataSource<R2, B>,
    f: Described.Described<(_: C) => Either.Either<A, B>>
  ): DataSource<R | R2, C>
}
```

Added in v1.0.0

## race

Returns a new data source that executes requests by sending them to this
data source and that data source, returning the results from the first data
source to complete and safely interrupting the loser.

**Signature**

```ts
export declare const race: {
  <R2, A2 extends Request.Request<any, any>>(that: DataSource<R2, A2>): <R, A extends Request.Request<any, any>>(
    self: DataSource<R, A>
  ) => DataSource<R2 | R, A2 | A>
  <R, A extends Request.Request<any, any>, R2, A2 extends Request.Request<any, any>>(
    self: DataSource<R, A>,
    that: DataSource<R2, A2>
  ): DataSource<R | R2, A | A2>
}
```

Added in v1.0.0

# constructors

## fromFunction

Constructs a data source from a pure function.

**Signature**

```ts
export declare const fromFunction: <A extends Request.Request<never, any>>(
  name: string,
  f: (request: A) => Request.Request.Success<A>
) => DataSource<never, A>
```

Added in v1.0.0

## fromFunctionBatched

Constructs a data source from a pure function that takes a list of requests
and returns a list of results of the same size. Each item in the result
list must correspond to the item at the same index in the request list.

**Signature**

```ts
export declare const fromFunctionBatched: <A extends Request.Request<never, any>>(
  name: string,
  f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Request.Request.Success<A>>
) => DataSource<never, A>
```

Added in v1.0.0

## fromFunctionBatchedEffect

Constructs a data source from an effectual function that takes a list of
requests and returns a list of results of the same size. Each item in the
result list must correspond to the item at the same index in the request
list.

**Signature**

```ts
export declare const fromFunctionBatchedEffect: <R, A extends Request.Request<any, any>>(
  name: string,
  f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Request.Request.Success<A>>>
) => DataSource<R, A>
```

Added in v1.0.0

## fromFunctionBatchedOption

Constructs a data source from a pure function that takes a list of requests
and returns a list of optional results of the same size. Each item in the
result list must correspond to the item at the same index in the request
list.

**Signature**

```ts
export declare const fromFunctionBatchedOption: <A extends Request.Request<never, any>>(
  name: string,
  f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Option.Option<Request.Request.Success<A>>>
) => DataSource<never, A>
```

Added in v1.0.0

## fromFunctionBatchedOptionEffect

Constructs a data source from an effectual function that takes a list of
requests and returns a list of optional results of the same size. Each item
in the result list must correspond to the item at the same index in the
request list.

**Signature**

```ts
export declare const fromFunctionBatchedOptionEffect: <R, A extends Request.Request<any, any>>(
  name: string,
  f: (
    chunk: Chunk.Chunk<A>
  ) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Option.Option<Request.Request.Success<A>>>>
) => DataSource<R, A>
```

Added in v1.0.0

## fromFunctionBatchedWith

Constructs a data source from a function that takes a list of requests and
returns a list of results of the same size. Uses the specified function to
associate each result with the corresponding effect, allowing the function
to return the list of results in a different order than the list of
requests.

**Signature**

```ts
export declare const fromFunctionBatchedWith: <A extends Request.Request<any, any>>(
  name: string,
  f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Request.Request.Success<A>>,
  g: (value: Request.Request.Success<A>) => Request.Request<never, Request.Request.Success<A>>
) => DataSource<never, A>
```

Added in v1.0.0

## fromFunctionBatchedWithEffect

Constructs a data source from an effectual function that takes a list of
requests and returns a list of results of the same size. Uses the specified
function to associate each result with the corresponding effect, allowing
the function to return the list of results in a different order than the
list of requests.

**Signature**

```ts
export declare const fromFunctionBatchedWithEffect: <R, A extends Request.Request<any, any>>(
  name: string,
  f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Request.Request.Success<A>>>,
  g: (b: Request.Request.Success<A>) => Request.Request<Request.Request.Error<A>, Request.Request.Success<A>>
) => DataSource<R, A>
```

Added in v1.0.0

## fromFunctionEffect

Constructs a data source from an effectual function.

**Signature**

```ts
export declare const fromFunctionEffect: <R, A extends Request.Request<any, any>>(
  name: string,
  f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
) => DataSource<R, A>
```

Added in v1.0.0

## fromFunctionOption

Constructs a data source from a pure function that may not provide results
for all requests received.

**Signature**

```ts
export declare const fromFunctionOption: <A extends Request.Request<never, any>>(
  name: string,
  f: (a: A) => Option.Option<Request.Request.Success<A>>
) => DataSource<never, A>
```

Added in v1.0.0

## fromFunctionOptionEffect

Constructs a data source from an effectual function that may not provide
results for all requests received.

**Signature**

```ts
export declare const fromFunctionOptionEffect: <R, A extends Request.Request<any, any>>(
  name: string,
  f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Option.Option<Request.Request.Success<A>>>
) => DataSource<R, A>
```

Added in v1.0.0

## make

Constructs a data source with the specified identifier and method to run
requests.

**Signature**

```ts
export declare const make: <R, A>(
  identifier: string,
  runAll: (requests: Chunk.Chunk<Chunk.Chunk<A>>) => Effect.Effect<R, never, void>
) => DataSource<Exclude<R, CompletedRequestMap.CompletedRequestMap>, A>
```

Added in v1.0.0

## makeBatched

Constructs a data source from a function taking a collection of requests
and returning a `CompletedRequestMap`.

**Signature**

```ts
export declare const makeBatched: <R, A extends Request.Request<any, any>>(
  identifier: string,
  run: (requests: Chunk.Chunk<A>) => Effect.Effect<R, never, void>
) => DataSource<Exclude<R, CompletedRequestMap.CompletedRequestMap>, A>
```

Added in v1.0.0

## never

A data source that never executes requests.

**Signature**

```ts
export declare const never: (_: void) => DataSource<never, never>
```

Added in v1.0.0

# context

## contramapContext

Provides this data source with part of its required context.

**Signature**

```ts
export declare const contramapContext: {
  <R0, R>(f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>): <
    A extends Request.Request<any, any>
  >(
    self: DataSource<R, A>
  ) => DataSource<R0, A>
  <R, A extends Request.Request<any, any>, R0>(
    self: DataSource<R, A>,
    f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
  ): DataSource<R0, A>
}
```

Added in v1.0.0

## provideContext

Provides this data source with its required context.

**Signature**

```ts
export declare const provideContext: {
  <R>(context: Described.Described<Context.Context<R>>): <A extends Request.Request<any, any>>(
    self: DataSource<R, A>
  ) => DataSource<never, A>
  <R, A extends Request.Request<any, any>>(
    self: DataSource<R, A>,
    context: Described.Described<Context.Context<R>>
  ): DataSource<never, A>
}
```

Added in v1.0.0

# models

## DataSource (interface)

A `DataSource<R, A>` requires an environment `R` and is capable of executing
requests of type `A`.

Data sources must implement the method `runAll` which takes a collection of
requests and returns an effect with a `CompletedRequestMap` containing a
mapping from requests to results. The type of the collection of requests is
a `Chunk<Chunk<A>>`. The outer `Chunk` represents batches of requests that
must be performed sequentially. The inner `Chunk` represents a batch of
requests that can be performed in parallel. This allows data sources to
introspect on all the requests being executed and optimize the query.

Data sources will typically be parameterized on a subtype of `Request<A>`,
though that is not strictly necessarily as long as the data source can map
the request type to a `Request<A>`. Data sources can then pattern match on
the collection of requests to determine the information requested, execute
the query, and place the results into the `CompletedRequestMap` using
`CompletedRequestMap.empty` and `CompletedRequestMap.insert`. Data
sources must provide results for all requests received. Failure to do so
will cause a query to die with a `QueryFailure` when run.

**Signature**

```ts
export interface DataSource<R, A> extends Equal.Equal {
  /**
   * The data source's identifier.
   */
  readonly identifier: string
  /**
   * Execute a collection of requests. The outer `Chunk` represents batches
   * of requests that must be performed sequentially. The inner `Chunk`
   * represents a batch of requests that can be performed in parallel.
   */
  runAll(requests: Chunk.Chunk<Chunk.Chunk<A>>): Effect.Effect<R, never, CompletedRequestMap.CompletedRequestMap>
}
```

Added in v1.0.0

# refinements

## isDataSource

Returns `true` if the specified value is a `DataSource`, `false` otherwise.

**Signature**

```ts
export declare const isDataSource: (u: unknown) => u is DataSource<unknown, unknown>
```

Added in v1.0.0

# symbols

## DataSourceTypeId

**Signature**

```ts
export declare const DataSourceTypeId: typeof DataSourceTypeId
```

Added in v1.0.0

## DataSourceTypeId (type alias)

**Signature**

```ts
export type DataSourceTypeId = typeof DataSourceTypeId
```

Added in v1.0.0
