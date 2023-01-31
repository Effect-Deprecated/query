/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import type * as Ref from "@effect/io/Ref"
import * as internal from "@effect/query/internal/cache"
import type * as Request from "@effect/query/Request"
import type * as Either from "@fp-ts/core/Either"
import type * as Option from "@fp-ts/core/Option"

/**
 * @since 1.0.0
 * @category symbols
 */
export const CacheTypeId: unique symbol = internal.CacheTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type CacheTypeId = typeof CacheTypeId

/**
 * A `Cache` maintains an internal state with a mapping from requests to `Ref`s
 * that will contain the result of those requests when they are executed. This
 * is used internally by the library to provide deduplication and caching of
 * requests.
 *
 * @since 1.0.0
 * @category models
 */
export interface Cache extends Cache.Proto {
  /**
   * Looks up a request in the cache, failing with the unit value if the request
   * is not in the cache, succeeding with `Ref(None)` if the request is in the
   * cache but has not been executed yet, or `Ref(Some(value))` if the request
   * has been executed.
   */
  get<E, A>(request: Request.Request<E, A>): Effect.Effect<never, void, Ref.Ref<Option.Option<Either.Either<E, A>>>>

  /**
   * Looks up a request in the cache. If the request is not in the cache returns
   * a `Left` with a `Ref` that can be set with a `Some` to complete the
   * request. If the request is in the cache returns a `Right` with a `Ref` that
   * either contains `Some` with a result if the request has been executed or
   * `None` if the request has not been executed yet.
   */
  lookup<E, A>(
    request: Request.Request<E, A>
  ): Effect.Effect<
    never,
    never,
    Either.Either<
      Ref.Ref<Option.Option<Either.Either<E, A>>>,
      Ref.Ref<Option.Option<Either.Either<E, A>>>
    >
  >

  /**
   * Inserts a request and a `Ref` that will contain the result of the request
   * when it is executed into the cache.
   */
  set<E, A>(
    request: Request.Request<E, A>,
    result: Ref.Ref<Option.Option<Either.Either<E, A>>>
  ): Effect.Effect<never, never, void>

  /**
   * Removes a request from the cache.
   */
  remove<E, A>(request: Request.Request<E, A>): Effect.Effect<never, never, void>
}

/**
 * @since 1.0.0
 */
export declare namespace Cache {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [CacheTypeId]: CacheTypeId
  }
}

/**
 * Constructs an empty cache.
 *
 * @since 1.0.0
 * @category constructors
 */
export const empty: () => Effect.Effect<never, never, Cache> = internal.empty

/**
 * Looks up a request in the cache, failing with the unit value if the request
 * is not in the cache, succeeding with `Ref(None)` if the request is in the
 * cache but has not been executed yet, or `Ref(Some(value))` if the request
 * has been executed.
 *
 * @since 1.0.0
 * @category elements
 */
export const get: {
  <E, A>(
    self: Cache,
    request: Request.Request<E, A>
  ): Effect.Effect<never, void, Ref.Ref<Option.Option<Either.Either<E, A>>>>
  <E, A>(
    request: Request.Request<E, A>
  ): (
    self: Cache
  ) => Effect.Effect<never, void, Ref.Ref<Option.Option<Either.Either<E, A>>>>
} = internal.get

/**
 * Looks up a request in the cache. If the request is not in the cache returns
 * a `Left` with a `Ref` that can be set with a `Some` to complete the
 * request. If the request is in the cache returns a `Right` with a `Ref` that
 * either contains `Some` with a result if the request has been executed or
 * `None` if the request has not been executed yet.
 *
 * @since 1.0.0
 * @category elements
 */
export const lookup: {
  <E, A>(
    self: Cache,
    request: Request.Request<E, A>
  ): Effect.Effect<
    never,
    never,
    Either.Either<Ref.Ref<Option.Option<Either.Either<E, A>>>, Ref.Ref<Option.Option<Either.Either<E, A>>>>
  >
  <E, A>(
    request: Request.Request<E, A>
  ): (
    self: Cache
  ) => Effect.Effect<
    never,
    never,
    Either.Either<Ref.Ref<Option.Option<Either.Either<E, A>>>, Ref.Ref<Option.Option<Either.Either<E, A>>>>
  >
} = internal.lookup

/**
 * Inserts a request and a `Ref` that will contain the result of the request
 * when it is executed into the cache.
 *
 * @since 1.0.0
 * @category mutations
 */
export const set: {
  <E, A>(
    self: Cache,
    request: Request.Request<E, A>,
    result: Ref.Ref<Option.Option<Either.Either<E, A>>>
  ): Effect.Effect<never, never, void>
  <E, A>(
    request: Request.Request<E, A>,
    result: Ref.Ref<Option.Option<Either.Either<E, A>>>
  ): (self: Cache) => Effect.Effect<never, never, void>
} = internal.set

/**
 * Removes a request from the cache.
 *
 * @since 1.0.0
 * @category mutations
 */
export const remove: {
  <E, A>(self: Cache, request: Request.Request<E, A>): Effect.Effect<never, never, void>
  <E, A>(request: Request.Request<E, A>): (self: Cache) => Effect.Effect<never, never, void>
} = internal.remove
