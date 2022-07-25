import type { Request } from "@effect/query/Request"

/**
 * A `Cache` maintains an internal state with a mapping from requests to `Ref`s
 * that will contain the result of those requests when they are executed. This
 * is used internally by the library to provide deduplication and caching of
 * requests.
 *
 * @tsplus type effect/query/Cache
 */
export interface Cache {
  /**
   * Looks up a request in the cache, failing with the unit value if the
   * request is not in the cache, succeeding with `Ref(None)` if the request is
   * in the cache but has not been executed yet, or `Ref(Some(value))` if the
   * request has been executed.
   */
  get: <E, A>(request: Request<E, A>) => Effect<never, void, Ref<Maybe<Either<E, A>>>>
  /**
   * Looks up a request in the cache. If the request is not in the cache
   * returns a `Left` with a `Ref` that can be set with a `Some` to complete
   * the request. If the request is in the cache returns a `Right` with a `Ref`
   * that either contains `Some` with a result if the request has been executed
   * or `None` if the request has not been executed yet.
   */
  lookup: <E, A>(
    request: Request<E, A>
  ) => Effect<never, never, Either<Ref<Maybe<Either<E, A>>>, Ref<Maybe<Either<E, A>>>>>
  /**
   * Inserts a request and a `Ref` that will contain the result of the request
   * when it is executed into the cache.
   */
  put: <E, A>(
    request: Request<E, A>,
    result: Ref<Maybe<Either<E, A>>>
  ) => Effect<never, never, void>
  /**
   * Removes a request from the cache.
   */
  remove: <E, A>(request: Request<E, A>) => Effect<never, never, void>
}

/**
 * @tsplus type effect/query/Cache.Ops
 */
export interface CacheOps {}
export const Cache: CacheOps = {}

/**
 * Constructs an empty cache.
 *
 * @tsplus static effect/query/Cache.Ops empty
 */
export const empty: Effect<never, never, Cache> = Effect.succeed(unsafeMake())

/**
 * Unsafely constructs an empty cache.
 *
 * @tsplus static effect/query/Cache.Ops unsafeMake
 */
export function unsafeMake(): Cache {
  return new DefaultCache(Ref.unsafeMake(HashMap.empty()))
}

class DefaultCache implements Cache {
  constructor(readonly state: Ref<HashMap<any, any>>) {}

  get<E, A>(request: Request<E, A>): Effect<never, void, Ref<Maybe<Either<E, A>>>> {
    return this.state.get().map((map) => map.get(request)).some.orElseFail(undefined)
  }

  lookup<E, A>(
    request: Request<E, A>
  ): Effect<never, never, Either<Ref<Maybe<Either<E, A>>>, Ref<Maybe<Either<E, A>>>>> {
    return Ref.make(Maybe.emptyOf<Either<E, A>>()).flatMap((ref) =>
      this.state.modify((map) => {
        type ReturnValue = Either<Ref<Maybe<Either<E, A>>>, Ref<Maybe<Either<E, A>>>>
        const result = map.get(request)
        switch (result._tag) {
          case "None": {
            return Tuple(Either.left(ref) as ReturnValue, map.set(request, ref))
          }
          case "Some": {
            return Tuple(Either.right(result.value) as ReturnValue, map)
          }
        }
      })
    )
  }

  put<E, A>(request: Request<E, A>, result: Ref<Maybe<Either<E, A>>>): Effect<never, never, void> {
    return this.state.update((map) => map.set(request, result))
  }

  remove<E, A>(request: Request<E, A>): Effect<never, never, void> {
    return this.state.update((map) => map.remove(request))
  }
}
