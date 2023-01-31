/**
 * @since 1.0.0
 */

import type * as Effect from "@effect/io/Effect"
import type * as CompletedRequestMap from "@effect/query/CompletedRequestMap"
import type * as Described from "@effect/query/Described"
import * as internal from "@effect/query/internal/dataSource"
import type * as Request from "@effect/query/Request"
import type * as Either from "@fp-ts/core/Either"
import type * as Option from "@fp-ts/core/Option"
import type * as Chunk from "@fp-ts/data/Chunk"
import type * as Context from "@fp-ts/data/Context"
import type * as Equal from "@fp-ts/data/Equal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const DataSourceTypeId: unique symbol = internal.DataSourceTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type DataSourceTypeId = typeof DataSourceTypeId

/**
 * A `DataSource<R, A>` requires an environment `R` and is capable of executing
 * requests of type `A`.
 *
 * Data sources must implement the method `runAll` which takes a collection of
 * requests and returns an effect with a `CompletedRequestMap` containing a
 * mapping from requests to results. The type of the collection of requests is
 * a `Chunk<Chunk<A>>`. The outer `Chunk` represents batches of requests that
 * must be performed sequentially. The inner `Chunk` represents a batch of
 * requests that can be performed in parallel. This allows data sources to
 * introspect on all the requests being executed and optimize the query.
 *
 * Data sources will typically be parameterized on a subtype of `Request<A>`,
 * though that is not strictly necessarily as long as the data source can map
 * the request type to a `Request<A>`. Data sources can then pattern match on
 * the collection of requests to determine the information requested, execute
 * the query, and place the results into the `CompletedRequestMap` using
 * `CompletedRequestMap.empty` and `CompletedRequestMap.insert`. Data
 * sources must provide results for all requests received. Failure to do so
 * will cause a query to die with a `QueryFailure` when run.
 *
 * @since 1.0.0
 * @category models
 */
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

/**
 * @since 1.0.0
 */
export declare namespace DataSource {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<R, A> {
    readonly [DataSourceTypeId]: {
      readonly _R: (_: never) => R
      readonly _A: (_: never) => A
    }
  }
}

/**
 * Returns `true` if the specified value is a `DataSource`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isDataSource: (u: unknown) => u is DataSource<unknown, unknown> = internal.isDataSource

/**
 * Constructs a data source with the specified identifier and method to run
 * requests.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: <R, A>(
  identifier: string,
  runAll: (requests: Chunk.Chunk<Chunk.Chunk<A>>) => Effect.Effect<R, never, void>
) => DataSource<Exclude<R, CompletedRequestMap.CompletedRequestMap>, A> = internal.make

/**
 * Constructs a data source from a function taking a collection of requests
 * and returning a `CompletedRequestMap`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const makeBatched: <R, A extends Request.Request<any, any>>(
  identifier: string,
  run: (requests: Chunk.Chunk<A>) => Effect.Effect<R, never, void>
) => DataSource<Exclude<R, CompletedRequestMap.CompletedRequestMap>, A> = internal.makeBatched

/**
 * A data source aspect that executes requests between two effects, `before`
 * and `after`, where the result of `before` can be used by `after`.
 *
 * @since 1.0.0
 * @category combinators
 */
export const around: {
  <R, A extends Request.Request<any, any>, R2, A2, R3, _>(
    self: DataSource<R, A>,
    before: Described.Described<Effect.Effect<R2, never, A2>>,
    after: Described.Described<(a: A2) => Effect.Effect<R3, never, _>>
  ): DataSource<R | R2 | R3, A>
  <R2, A2, R3, _>(
    before: Described.Described<Effect.Effect<R2, never, A2>>,
    after: Described.Described<(a: A2) => Effect.Effect<R3, never, _>>
  ): <R, A extends Request.Request<any, any>>(self: DataSource<R, A>) => DataSource<R2 | R3 | R, A>
} = internal.around

/**
 * Returns a data source that executes at most `n` requests in parallel.
 *
 * @since 1.0.0
 * @category combinators
 */
export const batchN: {
  <R, A extends Request.Request<any, any>>(self: DataSource<R, A>, n: number): DataSource<R, A>
  (n: number): <R, A extends Request.Request<any, any>>(self: DataSource<R, A>) => DataSource<R, A>
} = internal.batchN

/**
 * Returns a new data source that executes requests of type `B` using the
 * specified function to transform `B` requests into requests that this data
 * source can execute.
 *
 * @since 1.0.0
 * @category combinators
 */
export const contramap: {
  <R, A extends Request.Request<any, any>, B extends Request.Request<any, any>>(
    self: DataSource<R, A>,
    f: Described.Described<(_: B) => A>
  ): DataSource<R, B>
  <A extends Request.Request<any, any>, B extends Request.Request<any, any>>(
    f: Described.Described<(_: B) => A>
  ): <R>(self: DataSource<R, A>) => DataSource<R, B>
} = internal.contramap

/**
 * Provides this data source with part of its required context.
 *
 * @since 1.0.0
 * @category context
 */
export const contramapContext: {
  <R, A extends Request.Request<any, any>, R0>(
    self: DataSource<R, A>,
    f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
  ): DataSource<R0, A>
  <R0, R>(
    f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
  ): <A extends Request.Request<any, any>>(
    self: DataSource<R, A>
  ) => DataSource<R0, A>
} = internal.contramapContext

/**
 * Returns a new data source that executes requests of type `B` using the
 * specified effectual function to transform `B` requests into requests that
 * this data source can execute.
 *
 * @since 1.0.0
 * @category combinators
 */
export const contramapEffect: {
  <R, A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>>(
    self: DataSource<R, A>,
    f: Described.Described<(_: B) => Effect.Effect<R2, never, A>>
  ): DataSource<R | R2, B>
  <A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>>(
    f: Described.Described<(_: B) => Effect.Effect<R2, never, A>>
  ): <R>(self: DataSource<R, A>) => DataSource<R2 | R, B>
} = internal.contramapEffect

/**
 * Returns a new data source that executes requests of type `C` using the
 * specified function to transform `C` requests into requests that either this
 * data source or that data source can execute.
 *
 * @since 1.0.0
 * @category combinators
 */
export const eitherWith: {
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
  <
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    that: DataSource<R2, B>,
    f: Described.Described<(_: C) => Either.Either<A, B>>
  ): <R>(self: DataSource<R, A>) => DataSource<R2 | R, C>
} = internal.eitherWith

/**
 * Constructs a data source from a pure function.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFunction: <A extends Request.Request<never, any>>(
  name: string,
  f: (request: A) => Request.Request.Success<A>
) => DataSource<never, A> = internal.fromFunction

/**
 * Constructs a data source from a pure function that takes a list of requests
 * and returns a list of results of the same size. Each item in the result
 * list must correspond to the item at the same index in the request list.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFunctionBatched: <A extends Request.Request<never, any>>(
  name: string,
  f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Request.Request.Success<A>>
) => DataSource<never, A> = internal.fromFunctionBatched

/**
 * Constructs a data source from an effectual function that takes a list of
 * requests and returns a list of results of the same size. Each item in the
 * result list must correspond to the item at the same index in the request
 * list.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFunctionBatchedEffect: <R, A extends Request.Request<any, any>>(
  name: string,
  f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Request.Request.Success<A>>>
) => DataSource<R, A> = internal.fromFunctionBatchedEffect

/**
 * Constructs a data source from a pure function that takes a list of requests
 * and returns a list of optional results of the same size. Each item in the
 * result list must correspond to the item at the same index in the request
 * list.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFunctionBatchedOption: <A extends Request.Request<never, any>>(
  name: string,
  f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Option.Option<Request.Request.Success<A>>>
) => DataSource<never, A> = internal.fromFunctionBatchedOption

/**
 * Constructs a data source from an effectual function that takes a list of
 * requests and returns a list of optional results of the same size. Each item
 * in the result list must correspond to the item at the same index in the
 * request list.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFunctionBatchedOptionEffect: <R, A extends Request.Request<any, any>>(
  name: string,
  f: (
    chunk: Chunk.Chunk<A>
  ) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Option.Option<Request.Request.Success<A>>>>
) => DataSource<R, A> = internal.fromFunctionBatchedOptionEffect

/**
 * Constructs a data source from a function that takes a list of requests and
 * returns a list of results of the same size. Uses the specified function to
 * associate each result with the corresponding effect, allowing the function
 * to return the list of results in a different order than the list of
 * requests.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFunctionBatchedWith: <A extends Request.Request<any, any>>(
  name: string,
  f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Request.Request.Success<A>>,
  g: (value: Request.Request.Success<A>) => Request.Request<never, Request.Request.Success<A>>
) => DataSource<never, A> = internal.fromFunctionBatchedWith

/**
 * Constructs a data source from an effectual function that takes a list of
 * requests and returns a list of results of the same size. Uses the specified
 * function to associate each result with the corresponding effect, allowing
 * the function to return the list of results in a different order than the
 * list of requests.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFunctionBatchedWithEffect: <R, A extends Request.Request<any, any>>(
  name: string,
  f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Request.Request.Success<A>>>,
  g: (b: Request.Request.Success<A>) => Request.Request<Request.Request.Error<A>, Request.Request.Success<A>>
) => DataSource<R, A> = internal.fromFunctionBatchedWithEffect

/**
 * Constructs a data source from an effectual function.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFunctionEffect: <R, A extends Request.Request<any, any>>(
  name: string,
  f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
) => DataSource<R, A> = internal.fromFunctionEffect

/**
 * Constructs a data source from a pure function that may not provide results
 * for all requests received.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFunctionOption: <A extends Request.Request<never, any>>(
  name: string,
  f: (a: A) => Option.Option<Request.Request.Success<A>>
) => DataSource<never, A> = internal.fromFunctionOption

/**
 * Constructs a data source from an effectual function that may not provide
 * results for all requests received.
 *
 * @since 1.0.0
 * @category constructors
 */
export const fromFunctionOptionEffect: <R, A extends Request.Request<any, any>>(
  name: string,
  f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Option.Option<Request.Request.Success<A>>>
) => DataSource<R, A> = internal.fromFunctionOptionEffect

/**
 * A data source that never executes requests.
 *
 * @since 1.0.0
 * @category constructors
 */
export const never: (_: void) => DataSource<never, never> = internal.never

/**
 * Provides this data source with its required context.
 *
 * @since 1.0.0
 * @category context
 */
export const provideContext: {
  <R, A extends Request.Request<any, any>>(
    self: DataSource<R, A>,
    context: Described.Described<Context.Context<R>>
  ): DataSource<never, A>
  <R>(
    context: Described.Described<Context.Context<R>>
  ): <A extends Request.Request<any, any>>(self: DataSource<R, A>) => DataSource<never, A>
} = internal.provideContext

/**
 * Returns a new data source that executes requests by sending them to this
 * data source and that data source, returning the results from the first data
 * source to complete and safely interrupting the loser.
 *
 * @since 1.0.0
 * @category combinators
 */
export const race: {
  <R, A extends Request.Request<any, any>, R2, A2 extends Request.Request<any, any>>(
    self: DataSource<R, A>,
    that: DataSource<R2, A2>
  ): DataSource<R | R2, A | A2>
  <R2, A2 extends Request.Request<any, any>>(
    that: DataSource<R2, A2>
  ): <R, A extends Request.Request<any, any>>(self: DataSource<R, A>) => DataSource<R2 | R, A2 | A>
} = internal.race
