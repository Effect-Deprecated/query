/**
 * @since 1.0.0
 */
import * as internal from "@effect/query/internal_effect_untraced/completedRequestMap"
import type * as Request from "@effect/query/Request"
import type * as Either from "@fp-ts/core/Either"
import type * as Option from "@fp-ts/core/Option"
import type * as Context from "@effect/data/Context"
import type * as HashMap from "@effect/data/HashMap"
import type * as HashSet from "@effect/data/HashSet"
import type * as MutableRef from "@effect/data/MutableRef"

/**
 * @since 1.0.0
 * @category symbols
 */
export const CompletedRequestMapTypeId: unique symbol = internal.CompletedRequestMapTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type CompletedRequestMapTypeId = typeof CompletedRequestMapTypeId

/**
 * A `CompletedRequestMap` is a universally quantified mapping from requests of
 * type `Request<E, A>` to results of type `Either<E, A>` for all types `E` and
 * `A`. The guarantee is that for any request of type `Request<E, A>`, if there
 * is a corresponding value in the map, that value is of type `Either<E, A>`.
 * This is used by the library to support data sources that return different
 * result types for different requests while guaranteeing that results will be
 * of the type requested.
 *
 * @since 1.0.0
 * @category models
 */
export interface CompletedRequestMap extends CompletedRequestMap.Proto {
  /** @internal */
  readonly map: MutableRef.MutableRef<
    HashMap.HashMap<
      Request.Request<unknown, unknown>,
      Either.Either<unknown, unknown>
    >
  >
}

/**
 * @since 1.0.0
 */
export declare namespace CompletedRequestMap {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [CompletedRequestMapTypeId]: CompletedRequestMapTypeId
  }
}

/**
 * The context tag for a `CompletedRequestMap`.
 *
 * @since 1.0.0
 * @category context
 */
export const Tag: Context.Tag<CompletedRequestMap> = internal.Tag

/**
 * An empty completed requests map.
 *
 * @since 1.0.0
 * @category constructors
 */
export const empty: () => CompletedRequestMap = internal.empty

/**
 * Constructs a new completed requests map with the specified request and
 * result.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: <E, A>(request: Request.Request<E, A>, result: Either.Either<E, A>) => CompletedRequestMap =
  internal.make

/**
 * Combines two completed request maps into a single completed request map.
 *
 * @since 1.0.0
 * @category combinators
 */
export const combine: {
  (self: CompletedRequestMap, that: CompletedRequestMap): CompletedRequestMap
  (that: CompletedRequestMap): (self: CompletedRequestMap) => CompletedRequestMap
} = internal.combine

/**
 * Retrieves the result of the specified request if it exists.
 *
 * @since 1.0.0
 * @category elements
 */
export const get: {
  <A extends Request.Request<any, any>>(
    self: CompletedRequestMap,
    request: A
  ): Option.Option<Request.Request.Result<A>>
  <A extends Request.Request<any, any>>(
    request: A
  ): (
    self: CompletedRequestMap
  ) => Option.Option<Request.Request.Result<A>>
} = internal.get

/**
 * Returns whether a result exists for the specified request.
 *
 * @since 1.0.0
 * @category elements
 */
export const has: {
  <A extends Request.Request<any, any>>(self: CompletedRequestMap, request: A): boolean
  <A extends Request.Request<any, any>>(request: A): (self: CompletedRequestMap) => boolean
} = internal.has

/**
 * Collects all requests in a set.
 *
 * @since 1.0.0
 * @category elements
 */
export const requests: (self: CompletedRequestMap) => HashSet.HashSet<Request.Request<unknown, unknown>> =
  internal.requests

/**
 * Appends the specified result to the completed requests map.
 *
 * @since 1.0.0
 * @category combinators
 */
export const set: {
  <A extends Request.Request<any, any>>(
    self: CompletedRequestMap,
    request: A,
    result: Request.Request.Result<A>
  ): void
  <A extends Request.Request<any, any>>(
    request: A,
    result: Request.Request.Result<A>
  ): (self: CompletedRequestMap) => void
} = internal.set

/**
 * Appends the specified optional result to the completed request map.
 *
 * @since 1.0.0
 * @category combinators
 */
export const setOption: {
  <A extends Request.Request<any, any>>(
    self: CompletedRequestMap,
    request: A,
    result: Request.Request.OptionalResult<A>
  ): void
  <A extends Request.Request<any, any>>(
    request: A,
    result: Request.Request.OptionalResult<A>
  ): (self: CompletedRequestMap) => void
} = internal.setOption
