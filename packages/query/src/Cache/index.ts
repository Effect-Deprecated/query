import "@effect-ts/system/Operator"

// port of: https://github.com/zio/zio-query/blob/b55364683726cc6611bec80876048ec5290cbcf5/zio-query/shared/src/main/scala/zio/query/Cache.scala
import * as T from "@effect-ts/core/Effect"
import * as E from "@effect-ts/core/Either"
import { pipe } from "@effect-ts/core/Function"
import * as HM from "@effect-ts/core/HashMap"
import * as O from "@effect-ts/core/Option"
import { _A, _E } from "@effect-ts/core/Utils"
import * as REF from "@effect-ts/system/Ref"

import type { Request } from "../Request"
import { eqSymbol, hashSymbol } from "../Request"

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
}

export const empty = pipe(
  REF.makeRef(
    HM.make<Request<any, any>, any>({
      equals: (x, y) => x[eqSymbol](y),
      hash: (x) => x[hashSymbol]()
    })
  ),
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
        REF.modify_(state, (cache) =>
          pipe(
            HM.get_(cache, request),
            O.fold(
              () => [E.left(ref) as RET, HM.set_(cache, request, ref)],
              () => [E.right(ref), cache]
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

  return { get, lookup, put }
}
