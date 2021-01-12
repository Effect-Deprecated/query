// port of: https://github.com/zio/zio-query/blob/9dfe9ca0b1e3077fc56cf5c983082af3ca7a62e7/zio-query/shared/src/main/scala/zio/query/CompletedRequestMap.scala
import * as E from "@effect-ts/core/Common/Either";
import * as M from "@effect-ts/core/Persistent/HashMap";
import * as O from "@effect-ts/core/Common/Option";
import { eqSymbol, hashSymbol, Request } from "./Request";

/**
 * A `CompletedRequestMap` is a universally quantified mapping from requests
 * of type `Request[E, A]` to results of type `Either[E, A]` for all types `E`
 * and `A`. The guarantee is that for any request of type `Request[E, A]`, if
 * there is a corresponding value in the map, that value is of type
 * `Either[E, A]`. This is used by the library to support data sources that
 * return different result types for different requests while guaranteeing that
 * results will be of the type requested.
 */

export class CompletedRequestMap {
  readonly _tag = "CompletedRequestMap";
  constructor(
    public readonly map: M.HashMap<Request<any, any>, E.Either<any, any>>
  ) {}
}

export function concat(
  a: CompletedRequestMap,
  b: CompletedRequestMap
): CompletedRequestMap {
  return new CompletedRequestMap(
    a.map.mutate((m) => {
      for (const [k, v] of b.map) {
        m.set(k, v);
      }
    })
  );
}

/**
 * Returns whether a result exists for the specified request.
 */
export function contains(request: any): (fa: CompletedRequestMap) => boolean {
  return (fa) => fa.map.has(request);
}

/**
 * Appends the specified result to the completed requests map.
 */
export function insert<E, A>(
  request: Request<E, A>
): (
  result: E.Either<E, A>
) => (fa: CompletedRequestMap) => CompletedRequestMap {
  return (result) => (fa) =>
    new CompletedRequestMap(fa.map.set(request, result));
}

/**
 * Appends the specified optional result to the completed request map.
 */
export function insertOption<E, A>(
  request: Request<E, A>
): (
  result: E.Either<E, O.Option<A>>
) => (fa: CompletedRequestMap) => CompletedRequestMap {
  return (result) => (fa) =>
    new CompletedRequestMap(
      E.fold_(
        result,
        (e) => fa.map.set(request, E.left(e)),
        O.fold(
          () => fa.map,
          (a) => fa.map.set(request, E.right(a))
        )
      )
    );
}

/**
 * Retrieves the result of the specified request if it exists.
 */
export function lookup<E, A>(
  request: Request<E, A>
): (fa: CompletedRequestMap) => O.Option<E.Either<E, A>> {
  return (fa) => fa.map.get(request);
}

/**
 * Collects all requests in a set.
 */
export function requests(fa: CompletedRequestMap): Set<Request<any, any>> {
  return new Set(fa.map.keys());
}

/**
 * An empty completed requests map.
 */
export const empty = new CompletedRequestMap(
  M.make({
    equals: (y) => (x) => y._tag === x._tag && x[eqSymbol](y),
    hash: (x) => x[hashSymbol](),
  })
);
