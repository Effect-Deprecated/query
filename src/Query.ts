/**
 * @since 1.0.0
 */
import type * as Chunk from "@effect/data/Chunk"
import type * as Context from "@effect/data/Context"
import type * as Debug from "@effect/data/Debug"
import type * as Duration from "@effect/data/Duration"
import type * as Either from "@effect/data/Either"
import type { LazyArg } from "@effect/data/Function"
import type * as Option from "@effect/data/Option"
import type * as Cause from "@effect/io/Cause"
import type * as Effect from "@effect/io/Effect"
import type * as Layer from "@effect/io/Layer"
import type * as Cache from "@effect/query/Cache"
import type * as DataSource from "@effect/query/DataSource"
import type * as Described from "@effect/query/Described"
import * as internal from "@effect/query/internal_effect_untraced/query"
import type * as Result from "@effect/query/internal_effect_untraced/result"
import type * as Request from "@effect/query/Request"

/**
 * @since 1.0.0
 * @category symbols
 */
export const QueryTypeId: unique symbol = internal.QueryTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type QueryTypeId = typeof QueryTypeId

/**
 * A `Query<R, E, A>` is a purely functional description of an effectual query
 * that may contain requests from one or more data sources, requires an
 * environment `R`, and may fail with an `E` or succeed with an `A`.
 *
 * Requests that can be performed in parallel, as expressed by `zipWithPar` and
 * combinators derived from it, will automatically be batched. Requests that
 * must be performed sequentially, as expressed by `zipWith` and combinators
 * derived from it, will automatically be pipelined. This allows for aggressive
 * data source specific optimizations. Requests can also be deduplicated and
 * cached.
 *
 * This allows for writing queries in a high level, compositional style, with
 * confidence that they will automatically be optimized. For example, consider
 * the following query from a user service.
 *
 * ```ts
 * import * as Chunk from "@effect/data/Chunk"
 * import * as Query from "@effect/query/Query"
 *
 * declare const getAllUserIds: Query.Query<never, never, Chunk.Chunk<number>>
 * declare const getUserNameById: (id: number) => Query.Query<never, never, string>
 *
 * const userNames = pipe(
 *   getAllUserIds,
 *   Query.flatMap(Query.forEachPar(getUserNameById))
 * )
 * ```
 *
 * This would normally require `N + 1` queries, one for `getAllUserIds` and one
 * for each call to `getUserNameById`. In contrast, `Query` will automatically
 * optimize this to two queries, one for `userIds` and one for `userNames`,
 * assuming an implementation of the user service that supports batching.
 *
 * Based on "There is no Fork: an Abstraction for Efficient, Concurrent, and
 * Concise Data Access" by Simon Marlow, Louis Brandy, Jonathan Coens, and Jon
 * Purdy. {@link http://simonmar.github.io/bib/papers/haxl-icfp14.pdf}
 *
 * @since 1.0.0
 * @category models
 */
export interface Query<R, E, A> extends Query.Variance<R, E, A>, Effect.Effect<R, E, A> {
  traced(trace: Debug.Trace): Query<R, E, A>

  /** @internal */
  readonly i0: Effect.Effect<R, never, Result.Result<R, E, A>>
}

/**
 * @since 1.0.0
 */
export declare namespace Query {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<R, E, A> {
    readonly [QueryTypeId]: {
      readonly _R: (_: never) => R
      readonly _E: (_: never) => E
      readonly _A: (_: never) => A
    }
  }
}

/**
 * Returns a query which submerges the error case of `Either` into the error
 * channel of the query
 *
 * The inverse of `Query.either`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const absolve: <R, E, A>(self: Query<R, E, Either.Either<E, A>>) => Query<R, E, A> = internal.absolve

/**
 * Executes the requests for a query between two effects, `before` and `after`,
 * where the result of `before` can be used by `after`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const around: {
  <R2, A2, R3, _>(
    before: Described.Described<Effect.Effect<R2, never, A2>>,
    after: Described.Described<(a: A2) => Effect.Effect<R3, never, _>>
  ): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R3 | R, E, A>
  <R, E, A, R2, A2, R3, _>(
    self: Query<R, E, A>,
    before: Described.Described<Effect.Effect<R2, never, A2>>,
    after: Described.Described<(a: A2) => Effect.Effect<R3, never, _>>
  ): Query<R | R2 | R3, E, A>
} = internal.around

/**
 * Maps the success value of this query to the specified constant value.
 *
 * @since 1.0.0
 * @category mapping
 */
export const as: {
  <A2>(value: A2): <R, E, A>(self: Query<R, E, A>) => Query<R, E, A2>
  <R, E, A, A2>(self: Query<R, E, A>, value: A2): Query<R, E, A2>
} = internal.as

/**
 * Lifts the error channel into a `Some` value for composition with other
 * optional queries.
 *
 * @since 1.0.0
 * @category mapping
 */
export const asSomeError: <R, E, A>(self: Query<R, E, A>) => Query<R, Option.Option<E>, A> = internal.asSomeError

/**
 * Maps the success value of this query to unit.
 *
 * @since 1.0.0
 * @category mapping
 */
export const asUnit: <R, E, A>(self: Query<R, E, A>) => Query<R, E, void> = internal.asUnit

/**
 * Enables caching for this query. Note that caching is enabled by default so
 * this will only be effective to enable caching in part of a larger query in
 * which caching has been disabled.
 *
 * @since 1.0.0
 * @category combinators
 */
export const cached: <R, E, A>(self: Query<R, E, A>) => Query<R, E, A> = internal.cached

/**
 * Recovers from all expected errors.
 *
 * @since 1.0.0
 * @category error handling
 */
export const catchAll: {
  <E, R2, E2, A2>(f: (error: E) => Query<R2, E2, A2>): <R, A>(self: Query<R, E, A>) => Query<R2 | R, E2, A2 | A>
  <R, A, E, R2, E2, A2>(self: Query<R, E, A>, f: (error: E) => Query<R2, E2, A2>): Query<R | R2, E2, A | A2>
} = internal.catchAll

/**
 * Recovers from all errors, both expected and unexpected, with provided
 * `Cause`.
 *
 * @since 1.0.0
 * @category error handling
 */
export const catchAllCause: {
  <E, R2, E2, A2>(
    f: (cause: Cause.Cause<E>) => Query<R2, E2, A2>
  ): <R, A>(self: Query<R, E, A>) => Query<R2 | R, E2, A2 | A>
  <R, E, A, R2, E2, A2>(
    self: Query<R, E, A>,
    f: (cause: Cause.Cause<E>) => Query<R2, E2, A2>
  ): Query<R | R2, E2, A | A2>
} = internal.catchAllCause

/**
 * Collects a collection of queries into a query returning a collection of
 * their results. Requests will be executed sequentially and will be
 * pipelined.
 *
 * @since 1.0.0
 * @category combinators
 */
export const collectAll: <R, E, A>(queries: Iterable<Query<R, E, A>>) => Query<R, E, Chunk.Chunk<A>> =
  internal.collectAll

/**
 * Collects a collection of queries into a query returning a collection of
 * their results, batching requests to data sources.
 *
 * @since 1.0.0
 * @category combinators
 */
export const collectAllBatched: <R, E, A>(queries: Iterable<Query<R, E, A>>) => Query<R, E, Chunk.Chunk<A>> =
  internal.collectAllBatched

/**
 * Collects a collection of queries into a query returning a collection of
 * their results. Requests will be executed in parallel and will be batched.
 *
 * @since 1.0.0
 * @category combinators
 */
export const collectAllPar: <R, E, A>(queries: Iterable<Query<R, E, A>>) => Query<R, E, Chunk.Chunk<A>> =
  internal.collectAllPar

/**
 * Accesses the whole context of the query.
 *
 * @since 1.0.0
 * @category context
 */
export const context: <R>(_: void) => Query<R, never, Context.Context<R>> = internal.context

/**
 * Accesses the context of the effect.
 *
 * @since 1.0.0
 * @category context
 */
export const contextWith: <R, A>(f: (context: Context.Context<R>) => A) => Query<R, never, A> = internal.contextWith

/**
 * Effectfully accesses the context of the effect.
 *
 * @since 1.0.0
 * @category context
 */
export const contextWithEffect: <R, R2, E, A>(
  f: (context: Context.Context<R>) => Effect.Effect<R2, E, A>
) => Query<R | R2, E, A> = internal.contextWithEffect

/**
 * Effectfully accesses the context of the effect.
 *
 * @since 1.0.0
 * @category context
 */
export const contextWithQuery: <R, R2, E, A>(
  f: (context: Context.Context<R>) => Query<R2, E, A>
) => Query<R | R2, E, A> = internal.contextWithQuery

/**
 * Provides this query with part of its required context.
 *
 * @since 1.0.0
 * @category context
 */
export const contramapContext: {
  <R0, R>(
    f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
  ): <E, A>(self: Query<R, E, A>) => Query<R0, E, A>
  <R, E, A, R0>(
    self: Query<R, E, A>,
    f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
  ): Query<R0, E, A>
} = internal.contramapContext

/**
 * Constructs a query that dies with the specified defect.
 *
 * @since 1.0.0
 * @category constructors
 */
export const die: (defect: unknown) => Query<never, never, never> = internal.die

/**
 * Constructs a query that dies with the specified lazily evaluated defect.
 *
 * @since 1.0.0
 * @category constructors
 */
export const dieSync: (evaluate: LazyArg<unknown>) => Query<never, never, never> = internal.dieSync

/**
 * Returns a query whose failure and success have been lifted into an
 * `Either`. The resulting query cannot fail, because the failure case has
 * been exposed as part of the `Either` success case.
 *
 * @since 1.0.0
 * @category combinators
 */
export const either: <R, E, A>(self: Query<R, E, A>) => Query<R, never, Either.Either<E, A>> = internal.either

/**
 * Ensures that if this query starts executing, the specified query will be
 * executed immediately after this query completes execution, whether by
 * success or failure.
 *
 * @since 1.0.0
 * @category finalization
 */
export const ensuring: {
  <R2, E2, A2>(finalizer: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, finalizer: Query<R2, E2, A2>): Query<R | R2, E | E2, A>
} = internal.ensuring

/**
 * Constructs a query that fails with the specified error.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fail: <E>(error: E) => Query<never, E, never> = internal.fail

/**
 * Constructs a query that fails with the specified lazily evaluated error.
 *
 * @since 1.0.0
 * @category constructors
 */
export const failSync: <E>(evaluate: LazyArg<E>) => Query<never, E, never> = internal.failSync

/**
 * Constructs a query that fails with the specified cause.
 *
 * @since 1.0.0
 * @category constructors
 */
export const failCause: <E>(cause: Cause.Cause<E>) => Query<never, E, never> = internal.failCause

/**
 * Constructs a query that fails with the specified cause.
 *
 * @since 1.0.0
 * @category constructors
 */
export const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Query<never, E, never> = internal.failCauseSync

/**
 * Returns a query that models execution of this query, followed by passing
 * its result to the specified function that returns a query. Requests
 * composed with `flatMap` or combinators derived from it will be executed
 * sequentially and will not be pipelined, though deduplication and caching of
 * requests may still be applied.
 *
 * @since 1.0.0
 * @category sequencing
 */
export const flatMap: {
  <A, R2, E2, A2>(f: (a: A) => Query<R2, E2, A2>): <R, E>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, f: (a: A) => Query<R2, E2, A2>): Query<R | R2, E | E2, A2>
} = internal.flatMap

/**
 * Returns a query that performs the outer query first, followed by the inner
 * query, yielding the value of the inner query.
 *
 * This method can be used to "flatten" nested queries.
 *
 * @since 1.0.0
 * @category sequencing
 */
export const flatten: <R, E, R2, E2, A>(self: Query<R, E, Query<R2, E2, A>>) => Query<R | R2, E | E2, A> =
  internal.flatten

/**
 * Performs a query for each element in a collection, collecting the results
 * into a query returning a collection of their results. Requests will be
 * executed sequentially and will be pipelined.
 *
 * @since 1.0.0
 * @category traversing
 */
export const forEach: {
  <A, R, E, B>(f: (a: A) => Query<R, E, B>): (elements: Iterable<A>) => Query<R, E, Chunk.Chunk<B>>
  <A, R, E, B>(elements: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<R, E, Chunk.Chunk<B>>
} = internal.forEach

/**
 * Performs a query for each element in a collection, batching requests to
 * data sources and collecting the results into a query returning a collection
 * of their results.
 *
 * @since 1.0.0
 * @category traversing
 */
export const forEachBatched: {
  <A, R, E, B>(f: (a: A) => Query<R, E, B>): (elements: Iterable<A>) => Query<R, E, Chunk.Chunk<B>>
  <A, R, E, B>(elements: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<R, E, Chunk.Chunk<B>>
} = internal.forEachBatched

/**
 * Performs a query for each element in a collection, collecting the results
 * into a query returning a collection of their results. Requests will be
 * executed in parallel and will be batched.
 *
 * @since 1.0.0
 * @category traversing
 */
export const forEachPar: {
  <A, R, E, B>(f: (a: A) => Query<R, E, B>): (elements: Iterable<A>) => Query<R, E, Chunk.Chunk<B>>
  <A, R, E, B>(elements: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<R, E, Chunk.Chunk<B>>
} = internal.forEachPar

/**
 * Constructs a query from an effect.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromEffect: <R, E, A>(effect: Effect.Effect<R, E, A>) => Query<R, E, A> = internal.fromEffect

/**
 * Constructs a query from an `Either`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromEither: <E, A>(either: Either.Either<E, A>) => Query<never, E, A> = internal.fromEither

/**
 * Constructs a query from an `Option`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromOption: <A>(option: Option.Option<A>) => Query<never, Option.Option<never>, A> = internal.fromOption

/**
 * Constructs a query from a request and a data source. Queries will die with
 * a `QueryFailure` when run if the data source does not provide results for
 * all requests received. Queries must be constructed with `fromRequest` or
 * one of its variants for optimizations to be applied.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromRequest: <R, A extends Request.Request<any, any>, A2 extends A>(
  request: A,
  dataSource: DataSource.DataSource<R, A2>
) => Query<R, Request.Request.Error<A>, Request.Request.Success<A>> = internal.fromRequest

/**
 * Constructs a query from a request and a data source but does not apply
 * caching to the query.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromRequestUncached: <R, A extends Request.Request<any, any>, A2 extends A>(
  request: A,
  dataSource: DataSource.DataSource<R, A2>
) => Query<R, Request.Request.Error<A>, Request.Request.Success<A>> = internal.fromRequestUncached

/**
 * This function returns `true` if the specified value is an `Query` value,
 * `false` otherwise.
 *
 * This function can be useful for checking the type of a value before
 * attempting to operate on it as an `Query` value. For example, you could
 * use `isQuery` to check the type of a value before using it as an
 * argument to a function that expects an `Query` value.
 *
 * @param u - The value to check for being an `Query` value.
 *
 * @returns `true` if the specified value is an `Query` value, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isQuery: (u: unknown) => u is Query<any, any, any> = internal.isQuery

/**
 * "Zooms in" on the value in the `Left` side of an `Either`, moving the
 * possibility that the value is a `Right` to the error channel.
 *
 * @since 1.0.0
 * @category combinators
 */
export const left: <R, E, A, A2>(self: Query<R, E, Either.Either<A, A2>>) => Query<R, Either.Either<E, A2>, A> =
  internal.left

/**
 * Maps the specified function over the successful result of this query.
 *
 * @since 1.0.0
 * @category mapping
 */
export const map: {
  <A, B>(f: (a: A) => B): <R, E>(self: Query<R, E, A>) => Query<R, E, B>
  <R, E, A, B>(self: Query<R, E, A>, f: (a: A) => B): Query<R, E, B>
} = internal.map

/**
 * Returns a query whose failure and success channels have been mapped by the
 * specified pair of functions, `f` and `g`.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapBoth: {
  <E, E2, A, A2>(f: (e: E) => E2, g: (a: A) => A2): <R>(self: Query<R, E, A>) => Query<R, E2, A2>
  <R, E, E2, A, A2>(self: Query<R, E, A>, f: (e: E) => E2, g: (a: A) => A2): Query<R, E2, A2>
} = internal.mapBoth

/**
 * Transforms all data sources with the specified data source aspect.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapDataSources: {
  <R, A, R2>(
    f: (dataSource: DataSource.DataSource<R, A>) => DataSource.DataSource<R2, A>
  ): <E>(self: Query<R, E, A>) => Query<R | R2, E, A>
  <R, E, A, R2>(
    self: Query<R, E, A>,
    f: (dataSource: DataSource.DataSource<R, A>) => DataSource.DataSource<R2, A>
  ): Query<R | R2, E, A>
} = internal.mapDataSources

/**
 * Maps the specified function over the failed result of this query.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapError: {
  <E, E2>(f: (e: E) => E2): <R, A>(self: Query<R, E, A>) => Query<R, E2, A>
  <R, A, E, E2>(self: Query<R, E, A>, f: (e: E) => E2): Query<R, E2, A>
} = internal.mapError

/**
 * Returns a query with its full cause of failure mapped using the specified
 * function. This can be used to transform errors while preserving the
 * original structure of `Cause`.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapErrorCause: {
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): <R, A>(self: Query<R, E, A>) => Query<R, E2, A>
  <R, E, A, E2>(self: Query<R, E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Query<R, E2, A>
} = internal.mapErrorCause

/**
 * Maps the specified effectual function over the result of this query.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapEffect: {
  <A, R2, E2, A2>(f: (a: A) => Effect.Effect<R2, E2, A2>): <R, E>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, f: (a: A) => Effect.Effect<R2, E2, A2>): Query<R | R2, E | E2, A2>
} = internal.mapEffect

/**
 * Folds over the failed or successful result of this query to yield a query
 * that does not fail, but succeeds with the value returned by the left or
 * right function passed to `match`.
 *
 * @since 1.0.0
 * @category folding
 */
export const match: {
  <E, Z, A>(onFailure: (error: E) => Z, onSuccess: (value: A) => Z): <R>(self: Query<R, E, A>) => Query<R, never, Z>
  <R, E, A, Z>(self: Query<R, E, A>, onFailure: (error: E) => Z, onSuccess: (value: A) => Z): Query<R, never, Z>
} = internal.match

/**
 * A more powerful version of `foldQuery` that allows recovering from any type
 * of failure except interruptions.
 *
 * @since 1.0.0
 * @category folding
 */
export const matchCauseQuery: {
  <E, R2, E2, A2, A, R3, E3, A3>(
    onFailure: (cause: Cause.Cause<E>) => Query<R2, E2, A2>,
    onSuccess: (value: A) => Query<R3, E3, A3>
  ): <R>(self: Query<R, E, A>) => Query<R2 | R3 | R, E2 | E3, A2 | A3>
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Query<R, E, A>,
    onFailure: (cause: Cause.Cause<E>) => Query<R2, E2, A2>,
    onSuccess: (value: A) => Query<R3, E3, A3>
  ): Query<R | R2 | R3, E2 | E3, A2 | A3>
} = internal.matchCauseQuery

/**
 * Recovers from errors by accepting one query to execute for the case of an
 * error, and one query to execute for the case of success.
 *
 * @since 1.0.0
 * @category folding
 */
export const matchQuery: {
  <E, R2, E2, A2, A, R3, E3, A3>(
    onFailure: (error: E) => Query<R2, E2, A2>,
    onSuccess: (value: A) => Query<R3, E3, A3>
  ): <R>(self: Query<R, E, A>) => Query<R2 | R3 | R, E2 | E3, A2 | A3>
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Query<R, E, A>,
    onFailure: (error: E) => Query<R2, E2, A2>,
    onSuccess: (value: A) => Query<R3, E3, A3>
  ): Query<R | R2 | R3, E2 | E3, A2 | A3>
} = internal.matchQuery

/**
 * Limits the query data sources to execute at most `n` requests in parallel.
 *
 * @since 1.0.0
 * @category combinators
 */
export const maxBatchSize: {
  (n: number): <R, E, A>(self: Query<R, E, A>) => Query<R, E, A>
  <R, E, A>(self: Query<R, E, A>, n: number): Query<R, E, A>
} = internal.maxBatchSize

/**
 * Constructs a query that never completes.
 *
 * @since 1.0.0
 * @category constructors
 */
export const never: (_: void) => Query<never, never, never> = internal.never

/**
 * Converts this query to one that returns `Some` if data sources return
 * results for all requests received and `None` otherwise.
 *
 * @since 1.0.0
 * @category combinators
 */
export const optional: <R, E, A>(self: Query<R, E, A>) => Query<R, E, Option.Option<A>> = internal.optional

/**
 * Converts this query to one that dies if a query failure occurs.
 *
 * @since 1.0.0
 * @category error handling
 */
export const orDie: <R, E, A>(self: Query<R, E, A>) => Query<R, never, A> = internal.orDie

/**
 * Converts this query to one that dies if a query failure occurs, using the
 * specified function to map the error to a defect.
 *
 * @since 1.0.0
 * @category error handling
 */
export const orDieWith: {
  <E>(f: (error: E) => unknown): <R, A>(self: Query<R, E, A>) => Query<R, never, A>
  <R, E, A>(self: Query<R, E, A>, f: (error: E) => unknown): Query<R, never, A>
} = internal.orDieWith

/**
 * Performs a query for each element in a collection, collecting the results
 * into a collection of failed results and a collection of successful results.
 * Requests will be executed sequentially and will be pipelined.
 *
 * @since 1.0.0
 * @category combinators
 */
export const partitionQuery: {
  <A, R, E, B>(
    f: (a: A) => Query<R, E, B>
  ): (elements: Iterable<A>) => Query<R, never, readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]>
  <A, R, E, B>(
    elements: Iterable<A>,
    f: (a: A) => Query<R, E, B>
  ): Query<R, never, readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]>
} = internal.partitionQuery

/**
 * Performs a query for each element in a collection, collecting the results
 * into a collection of failed results and a collection of successful results.
 * Requests will be executed in parallel and will be batched.
 *
 * @since 1.0.0
 * @category combinators
 */
export const partitionQueryPar: {
  <A, R, E, B>(
    f: (a: A) => Query<R, E, B>
  ): (elements: Iterable<A>) => Query<R, never, readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]>
  <A, R, E, B>(
    elements: Iterable<A>,
    f: (a: A) => Query<R, E, B>
  ): Query<R, never, readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]>
} = internal.partitionQueryPar

/**
 * Provides this query with its required context.
 *
 * @since 1.0.0
 * @category context
 */
export const provideContext: {
  <R>(context: Described.Described<Context.Context<R>>): <E, A>(self: Query<R, E, A>) => Query<never, E, A>
  <R, E, A>(self: Query<R, E, A>, context: Described.Described<Context.Context<R>>): Query<never, E, A>
} = internal.provideContext

/**
 * Provides a layer to this query, which translates it to another level.
 *
 * @since 1.0.0
 * @category context
 */
export const provideLayer: {
  <R0, E2, R>(layer: Described.Described<Layer.Layer<R0, E2, R>>): <E, A>(self: Query<R, E, A>) => Query<R0, E2 | E, A>
  <R, E, A, R0, E2>(self: Query<R, E, A>, layer: Described.Described<Layer.Layer<R0, E2, R>>): Query<R0, E | E2, A>
} = internal.provideLayer

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @since 1.0.0
 * @category context
 */
export const provideSomeLayer: {
  <R2, E2, A2>(
    layer: Described.Described<Layer.Layer<R2, E2, A2>>
  ): <R, E, A>(self: Query<R, E, A>) => Query<R2 | Exclude<R, A2>, E2 | E, A>
  <R, E, A, R2, E2, A2>(
    self: Query<R, E, A>,
    layer: Described.Described<Layer.Layer<R2, E2, A2>>
  ): Query<R2 | Exclude<R, A2>, E | E2, A>
} = internal.provideSomeLayer

/**
 * Races this query with the specified query, returning the result of the
 * first to complete successfully and safely interrupting the other.
 *
 * @since 1.0.0
 * @category combinators
 */
export const race: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A | A2>
} = internal.race

/**
 * Keeps some of the errors, and terminates the query with the rest.
 *
 * @since 1.0.0
 * @category error handling
 */
export const refineOrDie: {
  <E, E2>(pf: (error: E) => Option.Option<E2>): <R, A>(self: Query<R, E, A>) => Query<R, E2, A>
  <R, E, A, E2>(self: Query<R, E, A>, pf: (error: E) => Option.Option<E2>): Query<R, E2, A>
} = internal.refineOrDie

/**
 * Keeps some of the errors, and terminates the query with the rest, using the
 * specified function to convert the `E` into a defect.
 *
 * @since 1.0.0
 * @category error handling
 */
export const refineOrDieWith: {
  <E, E2>(
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ): <R, A>(self: Query<R, E, A>) => Query<R, E2, A>
  <R, E, A, E2>(self: Query<R, E, A>, pf: (error: E) => Option.Option<E2>, f: (error: E) => unknown): Query<R, E2, A>
} = internal.refineOrDieWith

/**
 * "Zooms in" on the value in the `Right` side of an `Either`, moving the
 * possibility that the value is a `Left` to the error channel.
 *
 * @since 1.0.0
 * @category combinators
 */
export const right: <R, E, A, A2>(self: Query<R, E, Either.Either<A, A2>>) => Query<R, Either.Either<A, E>, A2> =
  internal.right

/**
 * Returns an effect that models executing this query.
 *
 * @since 1.0.0
 * @category destructors
 */
export const run: <R, E, A>(self: Query<R, E, A>) => Effect.Effect<R, E, A> = internal.run

/**
 * Returns an effect that models executing this query with the specified
 * cache.
 *
 * @since 1.0.0
 * @category destructors
 */
export const runCache: {
  (cache: Cache.Cache): <R, E, A>(self: Query<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(self: Query<R, E, A>, cache: Cache.Cache): Effect.Effect<R, E, A>
} = internal.runCache

/**
 * Returns an effect that models executing this query, returning the query
 * result along with the cache.
 *
 * @since 1.0.0
 * @category destructors
 */
export const runLog: <R, E, A>(self: Query<R, E, A>) => Effect.Effect<R, E, readonly [Cache.Cache, A]> = internal.runLog

/**
 * Expose the full cause of failure of this query.
 *
 * @since 1.0.0
 * @category combinators
 */
export const sandbox: <R, E, A>(self: Query<R, E, A>) => Query<R, Cause.Cause<E>, A> = internal.sandbox

/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike, as in:
 *
 * @since 1.0.0
 * @category combinators
 */
export const sandboxWith: {
  <R, E, A, R2, E2, A2>(
    f: (self: Query<R, Cause.Cause<E>, A>) => Query<R2, Cause.Cause<E2>, A2>
  ): (self: Query<R, E, A>) => Query<R | R2, E2, A | A2>
  <R, E, A, R2, E2, A2>(
    self: Query<R, E, A>,
    f: (self: Query<R, Cause.Cause<E>, A>) => Query<R2, Cause.Cause<E2>, A2>
  ): Query<R | R2, E2, A | A2>
} = internal.sandboxWith

/**
 * Extracts a `Some` value into the value channel while moving the `None` into
 * the error channel for easier composition
 *
 * Inverse of `Query.unoption`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const some: <R, E, A>(self: Query<R, E, Option.Option<A>>) => Query<R, Option.Option<E>, A> = internal.some

/**
 * Extracts the optional value or succeeds with the given 'default' value.
 *
 * @since 1.0.0
 * @category combinators
 */
export const someOrElse: {
  <A, B>(def: LazyArg<B>): <R, E>(self: Query<R, E, Option.Option<A>>) => Query<R, E, A | B>
  <R, E, A, B>(self: Query<R, E, Option.Option<A>>, def: LazyArg<B>): Query<R, E, A | B>
} = internal.someOrElse

/**
 * Extracts the optional value or executes the given 'default' query.
 *
 * @since 1.0.0
 * @category combinators
 */
export const someOrElseEffect: {
  <R2, E2, A2>(
    def: LazyArg<Query<R2, E2, A2>>
  ): <R, E, A>(self: Query<R, E, Option.Option<A>>) => Query<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(
    self: Query<R, E, Option.Option<A>>,
    def: LazyArg<Query<R2, E2, A2>>
  ): Query<R | R2, E | E2, A | A2>
} = internal.someOrElseEffect

/**
 * Extracts the optional value or fails with the given error `e`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const someOrFail: {
  <E2>(error: LazyArg<E2>): <R, E, A>(self: Query<R, E, Option.Option<A>>) => Query<R, E2 | E, A>
  <R, E, A, E2>(self: Query<R, E, Option.Option<A>>, error: LazyArg<E2>): Query<R, E | E2, A>
} = internal.someOrFail

/**
 * Constructs a query that succeeds with the specified value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const succeed: <A>(value: A) => Query<never, never, A> = internal.succeed

/**
 * Constructs a query that succeds with the empty value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const succeedNone: (_: void) => Query<never, never, Option.Option<never>> = internal.succeedNone

/**
 * Constructs a query that succeeds with the optional value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const succeedSome: <A>(value: A) => Query<never, never, Option.Option<A>> = internal.succeedSome

/**
 * Summarizes a query by computing some value before and after execution, and
 * then combining the values to produce a summary, together with the result of
 * execution.
 *
 * @since 1.0.0
 * @category combinators
 */
export const summarized: {
  <R2, E2, B, C>(
    summary: Effect.Effect<R2, E2, B>,
    f: (start: B, end: B) => C
  ): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, readonly [C, A]>
  <R, E, A, R2, E2, B, C>(
    self: Query<R, E, A>,
    summary: Effect.Effect<R2, E2, B>,
    f: (start: B, end: B) => C
  ): Query<R | R2, E | E2, readonly [C, A]>
} = internal.summarized

/**
 * Returns a lazily constructed query.
 *
 * @since 1.0.0
 * @category constructors
 */
export const suspend: <R, E, A>(evaluate: LazyArg<Query<R, E, A>>) => Query<R, E, A> = internal.suspend

/**
 * Constructs a query that succeeds with the specified lazily evaluated value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const sync: <A>(evaluate: LazyArg<A>) => Query<never, never, A> = internal.sync

/**
 * Returns a new query that executes this one and times the execution.
 *
 * @since 1.0.0
 * @category combinators
 */
export const timed: <R, E, A>(self: Query<R, E, A>) => Query<R, E, readonly [Duration.Duration, A]> = internal.timed

/**
 * Returns an effect that will timeout this query, returning `None` if the
 * timeout elapses before the query was completed.
 *
 * @since 1.0.0
 * @category combinators
 */
export const timeout: {
  (duration: Duration.Duration): <R, E, A>(self: Query<R, E, A>) => Query<R, E, Option.Option<A>>
  <R, E, A>(self: Query<R, E, A>, duration: Duration.Duration): Query<R, E, Option.Option<A>>
} = internal.timeout

/**
 * The same as `Query.timeout`, but instead of producing a `None` in the event
 * of timeout, it will produce the specified error.
 *
 * @since 1.0.0
 * @category combinators
 */
export const timeoutFail: {
  <E2>(error: LazyArg<E2>, duration: Duration.Duration): <R, E, A>(self: Query<R, E, A>) => Query<R, E2 | E, A>
  <R, E, A, E2>(self: Query<R, E, A>, error: LazyArg<E2>, duration: Duration.Duration): Query<R, E | E2, A>
} = internal.timeoutFail

/**
 * The same as `Query.timeout`, but instead of producing a `None` in the event
 * of timeout, it will produce the specified failure.
 *
 * @since 1.0.0
 * @category combinators
 */
export const timeoutFailCause: {
  <E2>(
    evaluate: LazyArg<Cause.Cause<E2>>,
    duration: Duration.Duration
  ): <R, E, A>(self: Query<R, E, A>) => Query<R, E2 | E, A>
  <R, E, A, E2>(
    self: Query<R, E, A>,
    evaluate: LazyArg<Cause.Cause<E2>>,
    duration: Duration.Duration
  ): Query<R, E | E2, A>
} = internal.timeoutFailCause

/**
 * Returns a query that will timeout this query, returning either the default
 * value if the timeout elapses before the query has completed or the result
 * of applying the function `f` to the successful result of the query.
 *
 * @since 1.0.0
 * @category combinators
 */
export const timeoutTo: {
  <B2, A, B>(def: B2, f: (a: A) => B, duration: Duration.Duration): <R, E>(self: Query<R, E, A>) => Query<R, E, B2 | B>
  <R, E, A, B2, B>(self: Query<R, E, A>, def: B2, f: (a: A) => B, duration: Duration.Duration): Query<R, E, B2 | B>
} = internal.timeoutTo

/**
 * Disables caching for this query.
 *
 * @since 1.0.0
 * @category combinators
 */
export const uncached: <R, E, A>(self: Query<R, E, A>) => Query<R, E, A> = internal.uncached

/**
 * The query that succeeds with the unit value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const unit: (_: void) => Query<never, never, void> = internal.unit

/**
 * Converts a `Query<R, Either<E, B>, A>` into a `Query<R, E, Either<A, B>>`.
 *
 * The inverse of `left`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const unleft: <R, E, E2, A>(self: Query<R, Either.Either<E, E2>, A>) => Query<R, E, Either.Either<A, E2>> =
  internal.unleft

/**
 * Converts an option on errors into an option on values.
 *
 * @since 1.0.0
 * @category combinators
 */
export const unoption: <R, E, A>(self: Query<R, Option.Option<E>, A>) => Query<R, E, Option.Option<A>> =
  internal.unoption

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @since 1.0.0
 * @category combinators
 */
export const unrefine: {
  <E, E2>(pf: (defect: unknown) => Option.Option<E2>): <R, A>(self: Query<R, E, A>) => Query<R, E | E2, A>
  <R, E, A, E2>(self: Query<R, E, A>, pf: (defect: unknown) => Option.Option<E2>): Query<R, E | E2, A>
} = internal.unrefine

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the error.
 *
 * @since 1.0.0
 * @category combinators
 */
export const unrefineWith: {
  <E, E2, E3>(
    pf: (defect: unknown) => Option.Option<E2>,
    f: (error: E) => E3
  ): <R, A>(self: Query<R, E, A>) => Query<R, E2 | E3, A>
  <R, E, A, E2, E3>(
    self: Query<R, E, A>,
    pf: (defect: unknown) => Option.Option<E2>,
    f: (error: E) => E3
  ): Query<R, E2 | E3, A>
} = internal.unrefineWith

/**
 * Converts a `Query<R, Either<B, E>, A>` into a `Query<R, E, Either<B, A>>`.
 *
 * The inverse of `right`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const unright: <R, E, E2, A>(self: Query<R, Either.Either<E, E2>, A>) => Query<R, E2, Either.Either<E, A>> =
  internal.unright

/**
 * The inverse operation `Query.sandbox`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const unsandbox: <R, E, A>(self: Query<R, Cause.Cause<E>, A>) => Query<R, E, A> = internal.unsandbox

/**
 * Unwraps a query that is produced by an effect.
 *
 * @since 1.0.0
 * @category combinators
 */
export const unwrap: <R, E, A>(effect: Effect.Effect<R, E, Query<R, E, A>>) => Query<R, E, A> = internal.unwrap

/**
 * Returns a query that models the execution of this query and the specified
 * query sequentially, combining their results into a tuple.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zip: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, readonly [A, A2]>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, readonly [A, A2]>
} = internal.zip

/**
 * Returns a query that models the execution of this query and the specified
 * query, batching requests to data sources and combining their results into a
 * tuple.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipBatched: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, readonly [A, A2]>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, readonly [A, A2]>
} = internal.zipBatched

/**
 * Returns a query that models the execution of this query and the specified
 * query, batching requests to data sources and returning the result of this
 * query.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipBatchedLeft: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A>
} = internal.zipBatchedLeft

/**
 * Returns a query that models the execution of this query and the specified
 * query, batching requests to data sources and returning the result of the
 * specified query.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipBatchedRight: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A2>
} = internal.zipBatchedRight

/**
 * Returns a query that models the execution of this query and the specified
 * query sequentially, returning the result of this query.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipLeft: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A>
} = internal.zipLeft

/**
 * Returns a query that models the execution of this query and the specified
 * query sequentially, returning the result of the specified query.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipRight: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A2>
} = internal.zipRight

/**
 * Returns a query that models the execution of this query and the specified
 * query in parallel, combining their results into a tuple.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipPar: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, readonly [A, A2]>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, readonly [A, A2]>
} = internal.zipPar

/**
 * Returns a query that models the execution of this query and the specified
 * query in parallel, returning the result of this query.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipParLeft: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A>
} = internal.zipParLeft

/**
 * Returns a query that models the execution of this query and the specified
 * query in parallel, returning the result of the specified query.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipParRight: {
  <R2, E2, A2>(that: Query<R2, E2, A2>): <R, E, A>(self: Query<R, E, A>) => Query<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Query<R, E, A>, that: Query<R2, E2, A2>): Query<R | R2, E | E2, A2>
} = internal.zipParRight

/**
 * Returns a query that models the execution of this query and the specified
 * query sequentially, combining their results with the specified function.
 * Requests composed with `zipWith` or combinators derived from it will
 * automatically be pipelined.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipWith: {
  <R2, E2, B, A, C>(
    that: Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ): <R, E>(
    self: Query<R, E, A>
  ) => Query<R2 | R, E2 | E, C>
  <R, E, A, R2, E2, B, C>(
    self: Query<R, E, A>,
    that: Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ): Query<R | R2, E | E2, C>
} = internal.zipWith

/**
 * Returns a query that models the execution of this query and the specified
 * query, batching requests to data sources.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipWithBatched: {
  <A, R2, E2, B, C>(
    that: Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ): <R, E>(
    self: Query<R, E, A>
  ) => Query<R2 | R, E2 | E, C>
  <R, E, A, R2, E2, B, C>(
    self: Query<R, E, A>,
    that: Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ): Query<R | R2, E | E2, C>
} = internal.zipWithBatched

/**
 * Returns a query that models the execution of this query and the specified
 * query in parallel, combining their results with the specified function.
 * Requests composed with `zipWithPar` or combinators derived from it will
 * automatically be batched.
 *
 * @since 1.0.0
 * @category zipping
 */
export const zipWithPar: {
  <A, R2, E2, B, C>(
    that: Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ): <R, E>(
    self: Query<R, E, A>
  ) => Query<R2 | R, E2 | E, C>
  <R, E, A, R2, E2, B, C>(
    self: Query<R, E, A>,
    that: Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ): Query<R | R2, E | E2, C>
} = internal.zipWithPar
