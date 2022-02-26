// ets_tracing: off

// port of: https://github.com/zio/zio-query/blob/86f51ef90e41db8a616087095d16df8da6751ed4/zio-query/shared/src/main/scala/zio/query/Cache.scala
import "@effect-ts/system/Operator"

import * as HM from "@effect-ts/core/Collections/Immutable/HashMap"
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple"
import * as T from "@effect-ts/core/Effect"
import * as E from "@effect-ts/core/Either"
import { pipe } from "@effect-ts/core/Function"
import * as O from "@effect-ts/core/Option"
import * as REF from "@effect-ts/system/Ref"

import type { Request } from "../Request/index.js"

/**
 * A `Cache` maintains an internal state with a mapping from requests to `Ref`s
 * that will contain the result of those requests when they are executed. This
 * is used internally by the library to provide deduplication and caching of
 * requests.
 */
export interface Cache {
  /**
   * Looks up a request in the cache, failing with the unit value if the
   * request is not in the cache, succeeding with `Ref(None)` if the request is
   * in the cache but has not been executed yet, or `Ref(Some(value))` if the
   * request has been executed.
   */
  get<E, A>(request: Request<E, A>): T.IO<void, REF.Ref<O.Option<E.Either<E, A>>>>
  /**
   * Looks up a request in the cache. If the request is not in the cache
   * returns a `Left` with a `Ref` that can be set with a `Some` to complete
   * the request. If the request is in the cache returns a `Right` with a `Ref`
   * that either contains `Some` with a result if the request has been executed
   * or `None` if the request has not been executed yet.
   */
  lookup<E, A>(
    request: Request<E, A>
  ): T.UIO<
    E.Either<REF.Ref<O.Option<E.Either<E, A>>>, REF.Ref<O.Option<E.Either<E, A>>>>
  >

  /**
   * Inserts a request and a `Ref` that will contain the result of the request
   * when it is executed into the cache.
   */
  put<E, A>(
    request: Request<E, A>,
    result: REF.Ref<O.Option<E.Either<E, A>>>
  ): T.UIO<void>

  /**
   * Removes a request from the cache.
   */
  remove<E, A>(request: Request<E, A>): T.UIO<void>
}

export const empty = pipe(
  REF.makeRef(HM.make<Request<any, any>, any>()),
  T.map(makeDefaultCache)
)

function makeDefaultCache(state: REF.Ref<HM.HashMap<Request<any, any>, any>>): Cache {
  function get<E, A>(
    request: Request<E, A>
  ): T.IO<void, REF.Ref<O.Option<E.Either<E, A>>>> {
    return pipe(REF.get(state), T.map(HM.get(request)), T.get, T.orElseFail(undefined))
  }

  function lookup<E, A>(
    request: Request<E, A>
  ): T.UIO<
    E.Either<REF.Ref<O.Option<E.Either<E, A>>>, REF.Ref<O.Option<E.Either<E, A>>>>
  > {
    type RET = E.Either<
      REF.Ref<O.Option<E.Either<E, A>>>,
      REF.Ref<O.Option<E.Either<E, A>>>
    >
    return pipe(
      REF.makeRef(O.emptyOf<E.Either<E, A>>()),
      T.chain((ref) =>
        REF.modify_(state, (map) =>
          pipe(
            HM.get_(map, request),
            O.fold(
              () => Tp.tuple(E.left(ref) as RET, HM.set_(map, request, ref)),
              (r) => Tp.tuple(E.right(r), map)
            )
          )
        )
      )
    )
  }

  function put<E, A>(
    request: Request<E, A>,
    result: REF.Ref<O.Option<E.Either<E, A>>>
  ): T.UIO<void> {
    return pipe(state, REF.update(HM.set(request, result)))
  }

  function remove<E, A>(request: Request<E, A>): T.UIO<void> {
    return pipe(state, REF.update(HM.remove(request)))
  }

  return { get, lookup, put, remove }
}
