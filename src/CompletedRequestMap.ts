import * as E from "@effect-ts/core/Classic/Either";
import * as M from "@effect-ts/core/Classic/Map";
import * as O from "@effect-ts/core/Classic/Option";
import { Request } from "./Request";

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
  constructor(public readonly map: ReadonlyMap<any, E.Either<any, any>>) {}
}

export function concat(
  a: CompletedRequestMap,
  b: CompletedRequestMap
): CompletedRequestMap {
  let merged: ReadonlyMap<any, E.Either<any, any>> = M.copy(a.map);
  for (const [k, v] of b.map.entries()) {
    merged = M.insert(k, v)(merged);
  }
  return new CompletedRequestMap(merged);
}

/**
 * Returns whether a result exists for the specified request.
 */
export function contains(request: any): (fa: CompletedRequestMap) => boolean {
  return (fa) => O.isSome(M.lookup_(fa.map, request));
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
    new CompletedRequestMap(M.insert(request, result)(fa.map));
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
        (e) => M.insert_(fa.map, request, E.left(e)),
        O.fold(
          () => fa.map,
          (a) => M.insert_(fa.map, request, E.right(a))
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
  return (fa) => M.lookup_(fa.map, request);
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
export const empty = new CompletedRequestMap(M.empty);
