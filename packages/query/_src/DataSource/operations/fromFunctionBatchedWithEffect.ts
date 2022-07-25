/**
 * Constructs a data source from an effectual function that takes a list of
 * requests and returns a list of results of the same size. Uses the
 * specified function to associate each result with the corresponding effect,
 * allowing the function to return the list of results in a different order
 * than the list of requests.
 *
 * @tsplus static effect/query/DataSource.Ops fromFunctionBatchedWithEffect
 */
export function fromFunctionBatchedWithEffect<R, E, A extends Request<any, any>>(
  name: string,
  f: (requests: Chunk<A>) => Effect<R, E, Chunk<Request.GetA<A>>>,
  g: (b: Request.GetA<A>) => Request<Request.GetE<A>, Request.GetA<A>>
): DataSource<R, A> {
  return DataSource.makeBatched(
    name,
    (requests) =>
      f(requests).fold(
        (e) => requests.map((a) => Tuple(a, Either.left(e))),
        (bs) => bs.map((b) => Tuple(g(b), Either.right(b)))
      ).map((chunk) =>
        chunk.reduce(CompletedRequestMap.empty, (map, { tuple: [k, v] }) => map.insert(k, v))
      )
  )
}
