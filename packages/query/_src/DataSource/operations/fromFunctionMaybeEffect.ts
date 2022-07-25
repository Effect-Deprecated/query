import type { Request } from "@effect/query/Request"

/**
 * Constructs a data source from an effectual function that may not provide
 * results for all requests received.
 *
 * @tsplus static effect/query/DataSource.Ops fromFunctionMaybeEffect
 */
export function fromFunctionMaybeEffect<R, E, A extends Request<any, any>>(
  name: string,
  f: (a: A) => Effect<R, E, Maybe<Request.GetA<A>>>
): DataSource<R, A> {
  return DataSource.makeBatched(
    name,
    (requests) =>
      Effect.forEachPar(
        requests,
        (a) => f(a).either().map((either) => Tuple(a, either))
      ).map((chunk) =>
        chunk.reduce(CompletedRequestMap.empty, (map, { tuple: [k, v] }) => map.insertMaybe(k, v))
      )
  )
}
