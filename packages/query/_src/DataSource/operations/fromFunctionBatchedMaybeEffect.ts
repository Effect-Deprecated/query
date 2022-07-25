import type { Request } from "@effect/query/Request"

/**
 * Constructs a data source from an effectual function that takes a list of
 * requests and returns a list of optional results of the same size. Each
 * item in the result list must correspond to the item at the same index in
 * the request list.
 *
 * @tsplus static effect/query/DataSource.Ops fromFunctionBatchedMaybeEffect
 */
export function fromFunctionBatchedMaybeEffect<R, E, A extends Request<any, any>>(
  name: string,
  f: (requests: Chunk<A>) => Effect<R, E, Chunk<Maybe<Request.GetA<A>>>>
): DataSource<R, A> {
  return DataSource.makeBatched(
    name,
    (requests) =>
      f(requests).fold(
        (e) => requests.map((a) => Tuple(a, Either.left(e))),
        (bs) => requests.zip(bs.map(Either.right))
      ).map((chunk) =>
        chunk.reduce(CompletedRequestMap.empty, (map, { tuple: [k, v] }) => map.insertMaybe(k, v))
      )
  )
}
