import type { Request } from "@effect/query/Request"

/**
 * Constructs a data source from an effectual function.
 *
 * @tsplus static effect/query/DataSource.Ops fromFunctionEffect
 */
export function fromFunctionEffect<R, E, A extends Request<any, any>>(
  name: string,
  f: (a: A) => Effect<R, E, Request.GetA<A>>
): DataSource<R, A> {
  return DataSource.makeBatched(name, (requests) =>
    Effect
      .forEachPar(requests, (a) => f(a).either.map((either) => Tuple(a, either)))
      .map((chunk) =>
        chunk.reduce(CompletedRequestMap.empty, (map, { tuple: [k, v] }) => map.insert(k, v))
      ))
}
