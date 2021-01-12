import * as T from "@effect-ts/core/Effect";
import * as REF from "@effect-ts/system/Ref";
import * as O from "@effect-ts/core/Common/Option";
import * as E from "@effect-ts/core/Common/Either";
import * as MAP from "@effect-ts/core/Common/Map";
import { Request } from "./Request";
import { pipe } from "@effect-ts/core/Function";

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
  get<E, A>(
    request: Request<E, A>
  ): T.IO<void, REF.Ref<O.Option<E.Either<E, A>>>>;
  /**
   * Looks up a request in the cache. If the request is not in the cache
   * returns a `Left` with a `Ref` that can be set with a `Some` to complete
   * the request. If the request is in the cache returns a `Right` with a `Ref`
   * that either contains `Some` with a result if the request has been executed
   * or `None` if the request has not been executed yet.
   */
  lookup<R, E, A, B>(
    request: A
  ): T.UIO<
    E.Either<
      REF.Ref<O.Option<E.Either<E, B>>>,
      REF.Ref<O.Option<E.Either<E, B>>>
    >
  >;

  /**
   * Inserts a request and a `Ref` that will contain the result of the request
   * when it is executed into the cache.
   */
  put<E, A>(
    request: Request<E, A>,
    result: REF.Ref<O.Option<E.Either<E, A>>>
  ): T.UIO<void>;
}

export const empty = pipe(REF.makeRef(MAP.make([])), T.map(makeDefaultCache));

function makeDefaultCache(state: REF.Ref<MAP.Map<any, any>>): Cache {
  function get<E, A>(
    request: Request<E, A>
  ): T.IO<void, REF.Ref<O.Option<E.Either<E, A>>>> {
    return pipe(
      REF.get(state),
      T.map(MAP.lookup(request)),
      T.get,
      T.orElseFail(undefined)
    );
  }

  function lookup<R, E, A, B>(
    request: A
  ): T.UIO<
    E.Either<
      REF.Ref<O.Option<E.Either<E, B>>>,
      REF.Ref<O.Option<E.Either<E, B>>>
    >
  > {
    return pipe(
      REF.makeRef(O.emptyOf<E.Either<E, B>>()),
      T.chain((ref) =>
        REF.modify_(state, (cache) =>
          pipe(
            MAP.lookup_(cache, request),
            O.fold(
              () => [E.left(ref), MAP.insert(request, ref)(cache)],
              (value) => [E.right(ref), cache] as any // TODO: use better infer of fold
            )
          )
        )
      )
    );
  }

  function put<E, A>(
    request: Request<E, A>,
    result: REF.Ref<O.Option<E.Either<E, A>>>
  ): T.UIO<void> {
    return pipe(state, REF.update(MAP.insert(request, result)));
  }

  return { get, lookup, put };
}
