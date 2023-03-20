---
title: Query.ts
nav_order: 5
parent: Modules
---

## Query overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [absolve](#absolve)
  - [around](#around)
  - [cached](#cached)
  - [collectAll](#collectall)
  - [collectAllBatched](#collectallbatched)
  - [collectAllPar](#collectallpar)
  - [either](#either)
  - [left](#left)
  - [maxBatchSize](#maxbatchsize)
  - [optional](#optional)
  - [partitionQuery](#partitionquery)
  - [partitionQueryPar](#partitionquerypar)
  - [race](#race)
  - [right](#right)
  - [sandbox](#sandbox)
  - [sandboxWith](#sandboxwith)
  - [some](#some)
  - [someOrElse](#someorelse)
  - [someOrElseEffect](#someorelseeffect)
  - [someOrFail](#someorfail)
  - [summarized](#summarized)
  - [timed](#timed)
  - [timeout](#timeout)
  - [timeoutFail](#timeoutfail)
  - [timeoutFailCause](#timeoutfailcause)
  - [timeoutTo](#timeoutto)
  - [uncached](#uncached)
  - [unleft](#unleft)
  - [unoption](#unoption)
  - [unrefine](#unrefine)
  - [unrefineWith](#unrefinewith)
  - [unright](#unright)
  - [unsandbox](#unsandbox)
  - [unwrap](#unwrap)
- [constructors](#constructors)
  - [die](#die)
  - [dieSync](#diesync)
  - [fail](#fail)
  - [failCause](#failcause)
  - [failCauseSync](#failcausesync)
  - [failSync](#failsync)
  - [fromEffect](#fromeffect)
  - [fromEither](#fromeither)
  - [fromOption](#fromoption)
  - [fromRequest](#fromrequest)
  - [fromRequestUncached](#fromrequestuncached)
  - [never](#never)
  - [succeed](#succeed)
  - [succeedNone](#succeednone)
  - [succeedSome](#succeedsome)
  - [suspend](#suspend)
  - [sync](#sync)
  - [unit](#unit)
- [context](#context)
  - [context](#context-1)
  - [contextWith](#contextwith)
  - [contextWithEffect](#contextwitheffect)
  - [contextWithQuery](#contextwithquery)
  - [contramapContext](#contramapcontext)
  - [provideContext](#providecontext)
  - [provideLayer](#providelayer)
  - [provideSomeLayer](#providesomelayer)
  - [service](#service)
  - [serviceWith](#servicewith)
  - [serviceWithEffect](#servicewitheffect)
  - [serviceWithQuery](#servicewithquery)
- [destructors](#destructors)
  - [run](#run)
  - [runCache](#runcache)
  - [runLog](#runlog)
- [error handling](#error-handling)
  - [catchAll](#catchall)
  - [catchAllCause](#catchallcause)
  - [orDie](#ordie)
  - [orDieWith](#ordiewith)
  - [refineOrDie](#refineordie)
  - [refineOrDieWith](#refineordiewith)
- [finalization](#finalization)
  - [ensuring](#ensuring)
- [folding](#folding)
  - [match](#match)
  - [matchCauseQuery](#matchcausequery)
  - [matchQuery](#matchquery)
- [mapping](#mapping)
  - [as](#as)
  - [asSomeError](#assomeerror)
  - [asUnit](#asunit)
  - [map](#map)
  - [mapBoth](#mapboth)
  - [mapDataSources](#mapdatasources)
  - [mapEffect](#mapeffect)
  - [mapError](#maperror)
  - [mapErrorCause](#maperrorcause)
- [models](#models)
  - [Query (interface)](#query-interface)
- [refinements](#refinements)
  - [isQuery](#isquery)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
  - [flatten](#flatten)
- [symbols](#symbols)
  - [QueryTypeId](#querytypeid)
  - [QueryTypeId (type alias)](#querytypeid-type-alias)
- [traversing](#traversing)
  - [forEach](#foreach)
  - [forEachBatched](#foreachbatched)
  - [forEachPar](#foreachpar)
- [zipping](#zipping)
  - [zip](#zip)
  - [zipBatched](#zipbatched)
  - [zipBatchedLeft](#zipbatchedleft)
  - [zipBatchedRight](#zipbatchedright)
  - [zipLeft](#zipleft)
  - [zipPar](#zippar)
  - [zipParLeft](#zipparleft)
  - [zipParRight](#zipparright)
  - [zipRight](#zipright)
  - [zipWith](#zipwith)
  - [zipWithBatched](#zipwithbatched)
  - [zipWithPar](#zipwithpar)

---

# combinators

## absolve

Returns a query which submerges the error case of `Either` into the error
channel of the query

The inverse of `Query.either`.

**Signature**

```ts
export declare const absolve: <R, E, A>(self: Query<R, E, Either.Either<E, A>>) => Query<R, E, A>
```

Added in v1.0.0

## around

Executes the requests for a query between two effects, `before` and `after`,
where the result of `before` can be used by `after`.

**Signature**

```ts
export declare const around: {
  <R2, A2, R3, _>(
    before: Described.Described<Effect.Effect<R2, never, A2>>,
    after: Described.Described<(a: A2) => Effect.Effect<R3, never, _>>
  ): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R3 | R, E, A>
  <R, E, A, R2, A2, R3, _>(
    self: Query<R, E, A>,
    before: Described.Described<Effect.Effect<R2, never, A2>>,
    after: Described.Described<(a: A2) => Effect.Effect<R3, never, _>>
  ): Query<R | R2 | R3, E, A>
}
```

Added in v1.0.0

## cached

Enables caching for this query. Note that caching is enabled by default so
this will only be effective to enable caching in part of a larger query in
which caching has been disabled.

**Signature**

```ts
export declare const cached: <R, E, A>(self: Query<R, E, A>) => Query<R, E, A>
```

Added in v1.0.0

## collectAll

Collects a collection of queries into a query returning a collection of
their results. Requests will be executed sequentially and will be
pipelined.

**Signature**

```ts
export declare const collectAll: <R, E, A>(queries: Iterable<Query<R, E, A>>) => Query<R, E, Chunk.Chunk<A>>
```

Added in v1.0.0

## collectAllBatched

Collects a collection of queries into a query returning a collection of
their results, batching requests to data sources.

**Signature**

```ts
export declare const collectAllBatched: <R, E, A>(queries: Iterable<Query<R, E, A>>) => Query<R, E, Chunk.Chunk<A>>
```

Added in v1.0.0

## collectAllPar

Collects a collection of queries into a query returning a collection of
their results. Requests will be executed in parallel and will be batched.

**Signature**

```ts
export declare const collectAllPar: <R, E, A>(queries: Iterable<Query<R, E, A>>) => Query<R, E, Chunk.Chunk<A>>
```

Added in v1.0.0

## either

Returns a query whose failure and success have been lifted into an
`Either`. The resulting query cannot fail, because the failure case has
been exposed as part of the `Either` success case.

**Signature**

```ts
export declare const either: <R, E, A>(self: Query<R, E, A>) => Query<R, never, Either.Either<E, A>>
```

Added in v1.0.0

## left

"Zooms in" on the value in the `Left` side of an `Either`, moving the
possibility that the value is a `Right` to the error channel.

**Signature**

```ts
export declare const left: <R, E, A, A2>(self: Query<R, E, Either.Either<A, A2>>) => Query<R, Either.Either<E, A2>, A>
```

Added in v1.0.0

## maxBatchSize

Limits the query data sources to execute at most `n` requests in parallel.

**Signature**

```ts
export declare const maxBatchSize: {
  (n: number): <R, E, A>(self: Query<R, E, A>) => Query<R, E, A>
  <R, E, A>(self: Query<R, E, A>, n: number): Query<R, E, A>
}
```

Added in v1.0.0

## optional

Converts this query to one that returns `Some` if data sources return
results for all requests received and `None` otherwise.

**Signature**

```ts
export declare const optional: <R, E, A>(self: Query<R, E, A>) => Query<R, E, Option.Option<A>>
```

Added in v1.0.0

## partitionQuery

Performs a query for each element in a collection, collecting the results
into a collection of failed results and a collection of successful results.
Requests will be executed sequentially and will be pipelined.

**Signature**

```ts
export declare const partitionQuery: {
  <A, R, E, B>(f: (a: A) => Query<R, E, B>): (
    elements: Iterable<A>
  ) => Query<R, never, readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]>
  <A, R, E, B>(elements: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<
    R,
    never,
    readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]
  >
}
```

Added in v1.0.0

## partitionQueryPar

Performs a query for each element in a collection, collecting the results
into a collection of failed results and a collection of successful results.
Requests will be executed in parallel and will be batched.

**Signature**

```ts
export declare const partitionQueryPar: {
  <A, R, E, B>(f: (a: A) => Query<R, E, B>): (
    elements: Iterable<A>
  ) => Query<R, never, readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]>
  <A, R, E, B>(elements: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<
    R,
    never,
    readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]
  >
}
```

Added in v1.0.0

## race

Races this query with the specified query, returning the result of the
first to complete successfully and safely interrupting the other.

**Signature**

```ts
export declare const race: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A | A2>
}
```

Added in v1.0.0

## right

"Zooms in" on the value in the `Right` side of an `Either`, moving the
possibility that the value is a `Left` to the error channel.

**Signature**

```ts
export declare const right: <R, E, A, A2>(self: Query<R, E, Either.Either<A, A2>>) => Query<R, Either.Either<A, E>, A2>
```

Added in v1.0.0

## sandbox

Expose the full cause of failure of this query.

**Signature**

```ts
export declare const sandbox: <R, E, A>(self: Query<R, E, A>) => Query<R, Cause.Cause<E>, A>
```

Added in v1.0.0

## sandboxWith

Companion helper to `sandbox`. Allows recovery, and partial recovery, from
errors and defects alike, as in:

**Signature**

```ts
export declare const sandboxWith: {
  <R, E, A, R2, E2, A2>(f: (self: Query<R, Cause.Cause<E>, A>) => Query<R2, Cause.Cause<E2>, A2>): (
    self: Query<R, E, A>
  ) => Query<R | R2, E2, A | A2>
  <R, E, A, R2, E2, A2>(
    self: Query<R, E, A>,
    f: (self: Query<R, Cause.Cause<E>, A>) => Query<R2, Cause.Cause<E2>, A2>
  ): Query<R | R2, E2, A | A2>
}
```

Added in v1.0.0

## some

Extracts a `Some` value into the value channel while moving the `None` into
the error channel for easier composition

Inverse of `Query.unoption`.

**Signature**

```ts
export declare const some: <R, E, A>(self: Query<R, E, Option.Option<A>>) => Query<R, Option.Option<E>, A>
```

Added in v1.0.0

## someOrElse

Extracts the optional value or succeeds with the given 'default' value.

**Signature**

```ts
export declare const someOrElse: {
  <A, B>(def: LazyArg<B>): <R, E>(self: Query<R, E, Option.Option<A>>) => Query<R, E, A | B>
  <R, E, A, B>(self: Query<R, E, Option.Option<A>>, def: LazyArg<B>): Query<R, E, A | B>
}
```

Added in v1.0.0

## someOrElseEffect

Extracts the optional value or executes the given 'default' query.

**Signature**

```ts
export declare const someOrElseEffect: {
  <R2, E2, A2>(def: LazyArg<Query<R2, E2, A2>>): <R, E, A>(
    self: Query<R, E, Option.Option<A>>
  ) => Query<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Query<R, E, Option.Option<A>>, def: LazyArg<Query<R2, E2, A2>>): Query<
    R | R2,
    E | E2,
    A | A2
  >
}
```

Added in v1.0.0

## someOrFail

Extracts the optional value or fails with the given error `e`.

**Signature**

```ts
export declare const someOrFail: {
  <E2>(error: LazyArg<E2>): <R, E, A>(self: Query<R, E, Option.Option<A>>) => Query<R, E2 | E, A>
  <R, E, A, E2>(self: Query<R, E, Option.Option<A>>, error: LazyArg<E2>): Query<R, E | E2, A>
}
```

Added in v1.0.0

## summarized

Summarizes a query by computing some value before and after execution, and
then combining the values to produce a summary, together with the result of
execution.

**Signature**

```ts
export declare const summarized: {
  <R2, E2, B, C>(summary: Effect.Effect<R2, E2, B>, f: (start: B, end: B) => C): <R, E, A>(
    self: Query<R, E, A>
  ) => Query<R2 | R, E2 | E, readonly [C, A]>
  <R, E, A, R2, E2, B, C>(self: Query<R, E, A>, summary: Effect.Effect<R2, E2, B>, f: (start: B, end: B) => C): Query<
    R | R2,
    E | E2,
    readonly [C, A]
  >
}
```

Added in v1.0.0

## timed

Returns a new query that executes this one and times the execution.

**Signature**

```ts
export declare const timed: <R, E, A>(self: Query<R, E, A>) => Query<R, E, readonly [Duration.Duration, A]>
```

Added in v1.0.0

## timeout

Returns an effect that will timeout this query, returning `None` if the
timeout elapses before the query was completed.

**Signature**

```ts
export declare const timeout: {
  (duration: Duration.Duration): <R, E, A>(self: Query<R, E, A>) => Query<R, E, Option.Option<A>>
  <R, E, A>(self: Query<R, E, A>, duration: Duration.Duration): Query<R, E, Option.Option<A>>
}
```

Added in v1.0.0

## timeoutFail

The same as `Query.timeout`, but instead of producing a `None` in the event
of timeout, it will produce the specified error.

**Signature**

```ts
export declare const timeoutFail: {
  <E2>(error: LazyArg<E2>, duration: Duration.Duration): <R, E, A>(self: Query<R, E, A>) => Query<R, E2 | E, A>
  <R, E, A, E2>(self: Query<R, E, A>, error: LazyArg<E2>, duration: Duration.Duration): Query<R, E | E2, A>
}
```

Added in v1.0.0

## timeoutFailCause

The same as `Query.timeout`, but instead of producing a `None` in the event
of timeout, it will produce the specified failure.

**Signature**

```ts
export declare const timeoutFailCause: {
  <E2>(evaluate: LazyArg<Cause.Cause<E2>>, duration: Duration.Duration): <R, E, A>(
    self: Query<R, E, A>
  ) => Query<R, E2 | E, A>
  <R, E, A, E2>(self: Query<R, E, A>, evaluate: LazyArg<Cause.Cause<E2>>, duration: Duration.Duration): Query<
    R,
    E | E2,
    A
  >
}
```

Added in v1.0.0

## timeoutTo

Returns a query that will timeout this query, returning either the default
value if the timeout elapses before the query has completed or the result
of applying the function `f` to the successful result of the query.

**Signature**

```ts
export declare const timeoutTo: {
  <B2, A, B>(def: B2, f: (a: A) => B, duration: Duration.Duration): <R, E>(self: Query<R, E, A>) => Query<R, E, B2 | B>
  <R, E, A, B2, B>(self: Query<R, E, A>, def: B2, f: (a: A) => B, duration: Duration.Duration): Query<R, E, B2 | B>
}
```

Added in v1.0.0

## uncached

Disables caching for this query.

**Signature**

```ts
export declare const uncached: <R, E, A>(self: Query<R, E, A>) => Query<R, E, A>
```

Added in v1.0.0

## unleft

Converts a `Query<R, Either<E, B>, A>` into a `Query<R, E, Either<A, B>>`.

The inverse of `left`.

**Signature**

```ts
export declare const unleft: <R, E, E2, A>(self: Query<R, Either.Either<E, E2>, A>) => Query<R, E, Either.Either<A, E2>>
```

Added in v1.0.0

## unoption

Converts an option on errors into an option on values.

**Signature**

```ts
export declare const unoption: <R, E, A>(self: Query<R, Option.Option<E>, A>) => Query<R, E, Option.Option<A>>
```

Added in v1.0.0

## unrefine

Takes some fiber failures and converts them into errors.

**Signature**

```ts
export declare const unrefine: {
  <E, E2>(pf: (defect: unknown) => Option.Option<E2>): <R, A>(self: Query<R, E, A>) => Query<R, E | E2, A>
  <R, E, A, E2>(self: Query<R, E, A>, pf: (defect: unknown) => Option.Option<E2>): Query<R, E | E2, A>
}
```

Added in v1.0.0

## unrefineWith

Takes some fiber failures and converts them into errors, using the
specified function to convert the error.

**Signature**

```ts
export declare const unrefineWith: {
  <E, E2, E3>(pf: (defect: unknown) => Option.Option<E2>, f: (error: E) => E3): <R, A>(
    self: Query<R, E, A>
  ) => Query<R, E2 | E3, A>
  <R, E, A, E2, E3>(self: Query<R, E, A>, pf: (defect: unknown) => Option.Option<E2>, f: (error: E) => E3): Query<
    R,
    E2 | E3,
    A
  >
}
```

Added in v1.0.0

## unright

Converts a `Query<R, Either<B, E>, A>` into a `Query<R, E, Either<B, A>>`.

The inverse of `right`.

**Signature**

```ts
export declare const unright: <R, E, E2, A>(
  self: Query<R, Either.Either<E, E2>, A>
) => Query<R, E2, Either.Either<E, A>>
```

Added in v1.0.0

## unsandbox

The inverse operation `Query.sandbox`.

**Signature**

```ts
export declare const unsandbox: <R, E, A>(self: Query<R, Cause.Cause<E>, A>) => Query<R, E, A>
```

Added in v1.0.0

## unwrap

Unwraps a query that is produced by an effect.

**Signature**

```ts
export declare const unwrap: <R, E, A>(effect: Effect.Effect<R, E, Query<R, E, A>>) => Query<R, E, A>
```

Added in v1.0.0

# constructors

## die

Constructs a query that dies with the specified defect.

**Signature**

```ts
export declare const die: (defect: unknown) => Query<never, never, never>
```

Added in v1.0.0

## dieSync

Constructs a query that dies with the specified lazily evaluated defect.

**Signature**

```ts
export declare const dieSync: (evaluate: LazyArg<unknown>) => Query<never, never, never>
```

Added in v1.0.0

## fail

Constructs a query that fails with the specified error.

**Signature**

```ts
export declare const fail: <E>(error: E) => Query<never, E, never>
```

Added in v1.0.0

## failCause

Constructs a query that fails with the specified cause.

**Signature**

```ts
export declare const failCause: <E>(cause: Cause.Cause<E>) => Query<never, E, never>
```

Added in v1.0.0

## failCauseSync

Constructs a query that fails with the specified cause.

**Signature**

```ts
export declare const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Query<never, E, never>
```

Added in v1.0.0

## failSync

Constructs a query that fails with the specified lazily evaluated error.

**Signature**

```ts
export declare const failSync: <E>(evaluate: LazyArg<E>) => Query<never, E, never>
```

Added in v1.0.0

## fromEffect

Constructs a query from an effect.

**Signature**

```ts
export declare const fromEffect: <R, E, A>(effect: Effect.Effect<R, E, A>) => Query<R, E, A>
```

Added in v1.0.0

## fromEither

Constructs a query from an `Either`.

**Signature**

```ts
export declare const fromEither: <E, A>(either: Either.Either<E, A>) => Query<never, E, A>
```

Added in v1.0.0

## fromOption

Constructs a query from an `Option`.

**Signature**

```ts
export declare const fromOption: <A>(option: Option.Option<A>) => Query<never, Option.Option<never>, A>
```

Added in v1.0.0

## fromRequest

Constructs a query from a request and a data source. Queries will die with
a `QueryFailure` when run if the data source does not provide results for
all requests received. Queries must be constructed with `fromRequest` or
one of its variants for optimizations to be applied.

**Signature**

```ts
export declare const fromRequest: <R, A extends Request.Request<any, any>, A2 extends A>(
  request: A,
  dataSource: DataSource.DataSource<R, A2>
) => Query<R, Request.Request.Error<A>, Request.Request.Success<A>>
```

Added in v1.0.0

## fromRequestUncached

Constructs a query from a request and a data source but does not apply
caching to the query.

**Signature**

```ts
export declare const fromRequestUncached: <R, A extends Request.Request<any, any>, A2 extends A>(
  request: A,
  dataSource: DataSource.DataSource<R, A2>
) => Query<R, Request.Request.Error<A>, Request.Request.Success<A>>
```

Added in v1.0.0

## never

Constructs a query that never completes.

**Signature**

```ts
export declare const never: (_: void) => Query<never, never, never>
```

Added in v1.0.0

## succeed

Constructs a query that succeeds with the specified value.

**Signature**

```ts
export declare const succeed: <A>(value: A) => Query<never, never, A>
```

Added in v1.0.0

## succeedNone

Constructs a query that succeds with the empty value.

**Signature**

```ts
export declare const succeedNone: (_: void) => Query<never, never, Option.Option<never>>
```

Added in v1.0.0

## succeedSome

Constructs a query that succeeds with the optional value.

**Signature**

```ts
export declare const succeedSome: <A>(value: A) => Query<never, never, Option.Option<A>>
```

Added in v1.0.0

## suspend

Returns a lazily constructed query.

**Signature**

```ts
export declare const suspend: <R, E, A>(evaluate: LazyArg<Query<R, E, A>>) => Query<R, E, A>
```

Added in v1.0.0

## sync

Constructs a query that succeeds with the specified lazily evaluated value.

**Signature**

```ts
export declare const sync: <A>(evaluate: LazyArg<A>) => Query<never, never, A>
```

Added in v1.0.0

## unit

The query that succeeds with the unit value.

**Signature**

```ts
export declare const unit: (_: void) => Query<never, never, void>
```

Added in v1.0.0

# context

## context

Accesses the whole context of the query.

**Signature**

```ts
export declare const context: <R>(_: void) => Query<R, never, Context.Context<R>>
```

Added in v1.0.0

## contextWith

Accesses the context of the effect.

**Signature**

```ts
export declare const contextWith: <R, A>(f: (context: Context.Context<R>) => A) => Query<R, never, A>
```

Added in v1.0.0

## contextWithEffect

Effectfully accesses the context of the effect.

**Signature**

```ts
export declare const contextWithEffect: <R, R2, E, A>(
  f: (context: Context.Context<R>) => Effect.Effect<R2, E, A>
) => Query<R | R2, E, A>
```

Added in v1.0.0

## contextWithQuery

Effectfully accesses the context of the effect.

**Signature**

```ts
export declare const contextWithQuery: <R, R2, E, A>(
  f: (context: Context.Context<R>) => Query<R2, E, A>
) => Query<R | R2, E, A>
```

Added in v1.0.0

## contramapContext

Provides this query with part of its required context.

**Signature**

```ts
export declare const contramapContext: {
  <R0, R>(f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>): <E, A>(
    self: Query<R, E, A>
  ) => Query<R0, E, A>
  <R, E, A, R0>(
    self: Query<R, E, A>,
    f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
  ): Query<R0, E, A>
}
```

Added in v1.0.0

## provideContext

Provides this query with its required context.

**Signature**

```ts
export declare const provideContext: {
  <R>(context: Described.Described<Context.Context<R>>): <E, A>(self: Query<R, E, A>) => Query<never, E, A>
  <R, E, A>(self: Query<R, E, A>, context: Described.Described<Context.Context<R>>): Query<never, E, A>
}
```

Added in v1.0.0

## provideLayer

Provides a layer to this query, which translates it to another level.

**Signature**

```ts
export declare const provideLayer: {
  <R0, E2, R>(layer: Described.Described<Layer.Layer<R0, E2, R>>): <E, A>(self: Query<R, E, A>) => Query<R0, E2 | E, A>
  <R, E, A, R0, E2>(self: Query<R, E, A>, layer: Described.Described<Layer.Layer<R0, E2, R>>): Query<R0, E | E2, A>
}
```

Added in v1.0.0

## provideSomeLayer

Splits the environment into two parts, providing one part using the
specified layer and leaving the remainder `R0`.

**Signature**

```ts
export declare const provideSomeLayer: {
  <R2, E2, A2>(layer: Described.Described<Layer.Layer<R2, E2, A2>>): <R, E, A>(
    self: Query<R, E, A>
  ) => Query<R2 | Exclude<R, A2>, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, layer: Described.Described<Layer.Layer<R2, E2, A2>>): Query<
    R2 | Exclude<R, A2>,
    E | E2,
    A
  >
}
```

Added in v1.0.0

## service

Extracts the specified service from the context of the query.

**Signature**

```ts
export declare const service: <T>(tag: Context.Tag<T>) => Query<T, never, T>
```

Added in v1.0.0

## serviceWith

Accesses the specified service in the context of the query.

**Signature**

```ts
export declare const serviceWith: <T extends Context.Tag<any>, A>(
  tag: T,
  f: (a: Context.Tag.Service<T>) => A
) => Query<Context.Tag.Service<T>, never, A>
```

Added in v1.0.0

## serviceWithEffect

Effectfully accesses the specified service in the context of the query.

**Signature**

```ts
export declare const serviceWithEffect: <T extends Context.Tag<any>, R, E, A>(
  tag: T,
  f: (a: Context.Tag.Service<T>) => Effect.Effect<R, E, A>
) => Query<R | Context.Tag.Service<T>, E, A>
```

Added in v1.0.0

## serviceWithQuery

Effectfully accesses the specified service in the context of the query.

**Signature**

```ts
export declare const serviceWithQuery: <T extends Context.Tag<any>, R, E, A>(
  tag: T,
  f: (a: Context.Tag.Service<T>) => Query<R, E, A>
) => Query<R | Context.Tag.Service<T>, E, A>
```

Added in v1.0.0

# destructors

## run

Returns an effect that models executing this query.

**Signature**

```ts
export declare const run: <R, E, A>(self: Query<R, E, A>) => Effect.Effect<R, E, A>
```

Added in v1.0.0

## runCache

Returns an effect that models executing this query with the specified
cache.

**Signature**

```ts
export declare const runCache: {
  (cache: Cache.Cache): <R, E, A>(self: Query<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(self: Query<R, E, A>, cache: Cache.Cache): Effect.Effect<R, E, A>
}
```

Added in v1.0.0

## runLog

Returns an effect that models executing this query, returning the query
result along with the cache.

**Signature**

```ts
export declare const runLog: <R, E, A>(self: Query<R, E, A>) => Effect.Effect<R, E, readonly [Cache.Cache, A]>
```

Added in v1.0.0

# error handling

## catchAll

Recovers from all expected errors.

**Signature**

```ts
export declare const catchAll: {
  <E, R2, E2, A2>(f: (error: E) => Query<R2, E2, A2>): <R, A>(self: Query<R, E, A>) => Query<R2 | R, E2, A2 | A>
  <R, A, E, R2, E2, A2>(self: Query<R, E, A>, f: (error: E) => Query<R2, E2, A2>): Query<R | R2, E2, A | A2>
}
```

Added in v1.0.0

## catchAllCause

Recovers from all errors, both expected and unexpected, with provided
`Cause`.

**Signature**

```ts
export declare const catchAllCause: {
  <E, R2, E2, A2>(f: (cause: Cause.Cause<E>) => Query<R2, E2, A2>): <R, A>(
    self: Query<R, E, A>
  ) => Query<R2 | R, E2, A2 | A>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, f: (cause: Cause.Cause<E>) => Query<R2, E2, A2>): Query<
    R | R2,
    E2,
    A | A2
  >
}
```

Added in v1.0.0

## orDie

Converts this query to one that dies if a query failure occurs.

**Signature**

```ts
export declare const orDie: <R, E, A>(self: Query<R, E, A>) => Query<R, never, A>
```

Added in v1.0.0

## orDieWith

Converts this query to one that dies if a query failure occurs, using the
specified function to map the error to a defect.

**Signature**

```ts
export declare const orDieWith: {
  <E>(f: (error: E) => unknown): <R, A>(self: Query<R, E, A>) => Query<R, never, A>
  <R, E, A>(self: Query<R, E, A>, f: (error: E) => unknown): Query<R, never, A>
}
```

Added in v1.0.0

## refineOrDie

Keeps some of the errors, and terminates the query with the rest.

**Signature**

```ts
export declare const refineOrDie: {
  <E, E2>(pf: (error: E) => Option.Option<E2>): <R, A>(self: Query<R, E, A>) => Query<R, E2, A>
  <R, E, A, E2>(self: Query<R, E, A>, pf: (error: E) => Option.Option<E2>): Query<R, E2, A>
}
```

Added in v1.0.0

## refineOrDieWith

Keeps some of the errors, and terminates the query with the rest, using the
specified function to convert the `E` into a defect.

**Signature**

```ts
export declare const refineOrDieWith: {
  <E, E2>(pf: (error: E) => Option.Option<E2>, f: (error: E) => unknown): <R, A>(
    self: Query<R, E, A>
  ) => Query<R, E2, A>
  <R, E, A, E2>(self: Query<R, E, A>, pf: (error: E) => Option.Option<E2>, f: (error: E) => unknown): Query<R, E2, A>
}
```

Added in v1.0.0

# finalization

## ensuring

Ensures that if this query starts executing, the specified query will be
executed immediately after this query completes execution, whether by
success or failure.

**Signature**

```ts
export declare const ensuring: {
  <R2, E2, A2>(finalizer: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, finalizer: Query<R2, E2, A2>): Query<R | R2, E | E2, A>
}
```

Added in v1.0.0

# folding

## match

Folds over the failed or successful result of this query to yield a query
that does not fail, but succeeds with the value returned by the left or
right function passed to `match`.

**Signature**

```ts
export declare const match: {
  <E, Z, A>(onFailure: (error: E) => Z, onSuccess: (value: A) => Z): <R>(self: Query<R, E, A>) => Query<R, never, Z>
  <R, E, A, Z>(self: Query<R, E, A>, onFailure: (error: E) => Z, onSuccess: (value: A) => Z): Query<R, never, Z>
}
```

Added in v1.0.0

## matchCauseQuery

A more powerful version of `foldQuery` that allows recovering from any type
of failure except interruptions.

**Signature**

```ts
export declare const matchCauseQuery: {
  <E, R2, E2, A2, A, R3, E3, A3>(
    onFailure: (cause: Cause.Cause<E>) => Query<R2, E2, A2>,
    onSuccess: (value: A) => Query<R3, E3, A3>
  ): <R>(self: Query<R, E, A>) => Query<R2 | R3 | R, E2 | E3, A2 | A3>
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Query<R, E, A>,
    onFailure: (cause: Cause.Cause<E>) => Query<R2, E2, A2>,
    onSuccess: (value: A) => Query<R3, E3, A3>
  ): Query<R | R2 | R3, E2 | E3, A2 | A3>
}
```

Added in v1.0.0

## matchQuery

Recovers from errors by accepting one query to execute for the case of an
error, and one query to execute for the case of success.

**Signature**

```ts
export declare const matchQuery: {
  <E, R2, E2, A2, A, R3, E3, A3>(
    onFailure: (error: E) => Query<R2, E2, A2>,
    onSuccess: (value: A) => Query<R3, E3, A3>
  ): <R>(self: Query<R, E, A>) => Query<R2 | R3 | R, E2 | E3, A2 | A3>
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Query<R, E, A>,
    onFailure: (error: E) => Query<R2, E2, A2>,
    onSuccess: (value: A) => Query<R3, E3, A3>
  ): Query<R | R2 | R3, E2 | E3, A2 | A3>
}
```

Added in v1.0.0

# mapping

## as

Maps the success value of this query to the specified constant value.

**Signature**

```ts
export declare const as: {
  <A2>(value: A2): <R, E, A>(self: Query<R, E, A>) => Query<R, E, A2>
  <R, E, A, A2>(self: Query<R, E, A>, value: A2): Query<R, E, A2>
}
```

Added in v1.0.0

## asSomeError

Lifts the error channel into a `Some` value for composition with other
optional queries.

**Signature**

```ts
export declare const asSomeError: <R, E, A>(self: Query<R, E, A>) => Query<R, Option.Option<E>, A>
```

Added in v1.0.0

## asUnit

Maps the success value of this query to unit.

**Signature**

```ts
export declare const asUnit: <R, E, A>(self: Query<R, E, A>) => Query<R, E, void>
```

Added in v1.0.0

## map

Maps the specified function over the successful result of this query.

**Signature**

```ts
export declare const map: {
  <A, B>(f: (a: A) => B): <R, E>(self: Query<R, E, A>) => Query<R, E, B>
  <R, E, A, B>(self: Query<R, E, A>, f: (a: A) => B): Query<R, E, B>
}
```

Added in v1.0.0

## mapBoth

Returns a query whose failure and success channels have been mapped by the
specified pair of functions, `f` and `g`.

**Signature**

```ts
export declare const mapBoth: {
  <E, E2, A, A2>(f: (e: E) => E2, g: (a: A) => A2): <R>(self: Query<R, E, A>) => Query<R, E2, A2>
  <R, E, E2, A, A2>(self: Query<R, E, A>, f: (e: E) => E2, g: (a: A) => A2): Query<R, E2, A2>
}
```

Added in v1.0.0

## mapDataSources

Transforms all data sources with the specified data source aspect.

**Signature**

```ts
export declare const mapDataSources: {
  <R, A, R2>(f: (dataSource: DataSource.DataSource<R, A>) => DataSource.DataSource<R2, A>): <E>(
    self: Query<R, E, A>
  ) => Query<R | R2, E, A>
  <R, E, A, R2>(
    self: Query<R, E, A>,
    f: (dataSource: DataSource.DataSource<R, A>) => DataSource.DataSource<R2, A>
  ): Query<R | R2, E, A>
}
```

Added in v1.0.0

## mapEffect

Maps the specified effectual function over the result of this query.

**Signature**

```ts
export declare const mapEffect: {
  <A, R2, E2, A2>(f: (a: A) => Effect.Effect<R2, E2, A2>): <R, E>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, f: (a: A) => Effect.Effect<R2, E2, A2>): Query<R | R2, E | E2, A2>
}
```

Added in v1.0.0

## mapError

Maps the specified function over the failed result of this query.

**Signature**

```ts
export declare const mapError: {
  <E, E2>(f: (e: E) => E2): <R, A>(self: Query<R, E, A>) => Query<R, E2, A>
  <R, A, E, E2>(self: Query<R, E, A>, f: (e: E) => E2): Query<R, E2, A>
}
```

Added in v1.0.0

## mapErrorCause

Returns a query with its full cause of failure mapped using the specified
function. This can be used to transform errors while preserving the
original structure of `Cause`.

**Signature**

```ts
export declare const mapErrorCause: {
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): <R, A>(self: Query<R, E, A>) => Query<R, E2, A>
  <R, E, A, E2>(self: Query<R, E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Query<R, E2, A>
}
```

Added in v1.0.0

# models

## Query (interface)

A `Query<R, E, A>` is a purely functional description of an effectual query
that may contain requests from one or more data sources, requires an
environment `R`, and may fail with an `E` or succeed with an `A`.

Requests that can be performed in parallel, as expressed by `zipWithPar` and
combinators derived from it, will automatically be batched. Requests that
must be performed sequentially, as expressed by `zipWith` and combinators
derived from it, will automatically be pipelined. This allows for aggressive
data source specific optimizations. Requests can also be deduplicated and
cached.

This allows for writing queries in a high level, compositional style, with
confidence that they will automatically be optimized. For example, consider
the following query from a user service.

```ts
import * as Chunk from '@effect/data/Chunk'
import * as Query from '@effect/query/Query'

declare const getAllUserIds: Query.Query<never, never, Chunk.Chunk<number>>
declare const getUserNameById: (id: number) => Query.Query<never, never, string>

const userNames = pipe(getAllUserIds, Query.flatMap(Query.forEachPar(getUserNameById)))
```

This would normally require `N + 1` queries, one for `getAllUserIds` and one
for each call to `getUserNameById`. In contrast, `Query` will automatically
optimize this to two queries, one for `userIds` and one for `userNames`,
assuming an implementation of the user service that supports batching.

Based on "There is no Fork: an Abstraction for Efficient, Concurrent, and
Concise Data Access" by Simon Marlow, Louis Brandy, Jonathan Coens, and Jon
Purdy. {@link http://simonmar.github.io/bib/papers/haxl-icfp14.pdf}

**Signature**

```ts
export interface Query<R, E, A> extends Query.Variance<R, E, A>, Effect.Effect<R, E, A> {
  traced(trace: Debug.Trace): Query<R, E, A>

  /** @internal */
  readonly i0: Effect.Effect<R, never, Result.Result<R, E, A>>
}
```

Added in v1.0.0

# refinements

## isQuery

This function returns `true` if the specified value is an `Query` value,
`false` otherwise.

This function can be useful for checking the type of a value before
attempting to operate on it as an `Query` value. For example, you could
use `isQuery` to check the type of a value before using it as an
argument to a function that expects an `Query` value.

**Signature**

```ts
export declare const isQuery: (u: unknown) => u is Query<any, any, any>
```

Added in v1.0.0

# sequencing

## flatMap

Returns a query that models execution of this query, followed by passing
its result to the specified function that returns a query. Requests
composed with `flatMap` or combinators derived from it will be executed
sequentially and will not be pipelined, though deduplication and caching of
requests may still be applied.

**Signature**

```ts
export declare const flatMap: {
  <A, R2, E2, A2>(f: (a: A) => Query<R2, E2, A2>): <R, E>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, f: (a: A) => Query<R2, E2, A2>): Query<R | R2, E | E2, A2>
}
```

Added in v1.0.0

## flatten

Returns a query that performs the outer query first, followed by the inner
query, yielding the value of the inner query.

This method can be used to "flatten" nested queries.

**Signature**

```ts
export declare const flatten: <R, E, R2, E2, A>(self: Query<R, E, Query<R2, E2, A>>) => Query<R | R2, E | E2, A>
```

Added in v1.0.0

# symbols

## QueryTypeId

**Signature**

```ts
export declare const QueryTypeId: typeof QueryTypeId
```

Added in v1.0.0

## QueryTypeId (type alias)

**Signature**

```ts
export type QueryTypeId = typeof QueryTypeId
```

Added in v1.0.0

# traversing

## forEach

Performs a query for each element in a collection, collecting the results
into a query returning a collection of their results. Requests will be
executed sequentially and will be pipelined.

**Signature**

```ts
export declare const forEach: {
  <A, R, E, B>(f: (a: A) => Query<R, E, B>): (elements: Iterable<A>) => Query<R, E, Chunk.Chunk<B>>
  <A, R, E, B>(elements: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<R, E, Chunk.Chunk<B>>
}
```

Added in v1.0.0

## forEachBatched

Performs a query for each element in a collection, batching requests to
data sources and collecting the results into a query returning a collection
of their results.

**Signature**

```ts
export declare const forEachBatched: {
  <A, R, E, B>(f: (a: A) => Query<R, E, B>): (elements: Iterable<A>) => Query<R, E, Chunk.Chunk<B>>
  <A, R, E, B>(elements: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<R, E, Chunk.Chunk<B>>
}
```

Added in v1.0.0

## forEachPar

Performs a query for each element in a collection, collecting the results
into a query returning a collection of their results. Requests will be
executed in parallel and will be batched.

**Signature**

```ts
export declare const forEachPar: {
  <A, R, E, B>(f: (a: A) => Query<R, E, B>): (elements: Iterable<A>) => Query<R, E, Chunk.Chunk<B>>
  <A, R, E, B>(elements: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<R, E, Chunk.Chunk<B>>
}
```

Added in v1.0.0

# zipping

## zip

Returns a query that models the execution of this query and the specified
query sequentially, combining their results into a tuple.

**Signature**

```ts
export declare const zip: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, readonly [A, A2]>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, readonly [A, A2]>
}
```

Added in v1.0.0

## zipBatched

Returns a query that models the execution of this query and the specified
query, batching requests to data sources and combining their results into a
tuple.

**Signature**

```ts
export declare const zipBatched: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, readonly [A, A2]>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, readonly [A, A2]>
}
```

Added in v1.0.0

## zipBatchedLeft

Returns a query that models the execution of this query and the specified
query, batching requests to data sources and returning the result of this
query.

**Signature**

```ts
export declare const zipBatchedLeft: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A>
}
```

Added in v1.0.0

## zipBatchedRight

Returns a query that models the execution of this query and the specified
query, batching requests to data sources and returning the result of the
specified query.

**Signature**

```ts
export declare const zipBatchedRight: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A2>
}
```

Added in v1.0.0

## zipLeft

Returns a query that models the execution of this query and the specified
query sequentially, returning the result of this query.

**Signature**

```ts
export declare const zipLeft: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A>
}
```

Added in v1.0.0

## zipPar

Returns a query that models the execution of this query and the specified
query in parallel, combining their results into a tuple.

**Signature**

```ts
export declare const zipPar: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, readonly [A, A2]>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, readonly [A, A2]>
}
```

Added in v1.0.0

## zipParLeft

Returns a query that models the execution of this query and the specified
query in parallel, returning the result of this query.

**Signature**

```ts
export declare const zipParLeft: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A>
}
```

Added in v1.0.0

## zipParRight

Returns a query that models the execution of this query and the specified
query in parallel, returning the result of the specified query.

**Signature**

```ts
export declare const zipParRight: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A2>
}
```

Added in v1.0.0

## zipRight

Returns a query that models the execution of this query and the specified
query sequentially, returning the result of the specified query.

**Signature**

```ts
export declare const zipRight: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A2>
}
```

Added in v1.0.0

## zipWith

Returns a query that models the execution of this query and the specified
query sequentially, combining their results with the specified function.
Requests composed with `zipWith` or combinators derived from it will
automatically be pipelined.

**Signature**

```ts
export declare const zipWith: {
  <R2, E2, B, A, C>(that: Query<R2, E2, B>, f: (a: A, b: B) => C): <R, E>(
    self: Query<R, E, A>
  ) => Query<R2 | R, E2 | E, C>
  <R, E, A, R2, E2, B, C>(self: Query<R, E, A>, that: Query<R2, E2, B>, f: (a: A, b: B) => C): Query<R | R2, E | E2, C>
}
```

Added in v1.0.0

## zipWithBatched

Returns a query that models the execution of this query and the specified
query, batching requests to data sources.

**Signature**

```ts
export declare const zipWithBatched: {
  <A, R2, E2, B, C>(that: Query<R2, E2, B>, f: (a: A, b: B) => C): <R, E>(
    self: Query<R, E, A>
  ) => Query<R2 | R, E2 | E, C>
  <R, E, A, R2, E2, B, C>(self: Query<R, E, A>, that: Query<R2, E2, B>, f: (a: A, b: B) => C): Query<R | R2, E | E2, C>
}
```

Added in v1.0.0

## zipWithPar

Returns a query that models the execution of this query and the specified
query in parallel, combining their results with the specified function.
Requests composed with `zipWithPar` or combinators derived from it will
automatically be batched.

**Signature**

```ts
export declare const zipWithPar: {
  <A, R2, E2, B, C>(that: Query<R2, E2, B>, f: (a: A, b: B) => C): <R, E>(
    self: Query<R, E, A>
  ) => Query<R2 | R, E2 | E, C>
  <R, E, A, R2, E2, B, C>(self: Query<R, E, A>, that: Query<R2, E2, B>, f: (a: A, b: B) => C): Query<R | R2, E | E2, C>
}
```

Added in v1.0.0
