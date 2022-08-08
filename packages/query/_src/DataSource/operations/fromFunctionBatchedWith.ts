import type { Request } from "@effect/query/Request"

/**
 * Constructs a data source from a function that takes a list of requests and
 * returns a list of results of the same size. Uses the specified function to
 * associate each result with the corresponding effect, allowing the function
 * to return the list of results in a different order than the list of
 * requests.
 *
 * @tsplus static effect/query/DataSource.Ops fromFunctionBatchedWith
 */
export function fromFunctionBatchedWith<A extends Request<any, any>>(
  name: string,
  f: (requests: Chunk<A>) => Chunk<Request.GetA<A>>,
  g: (b: Request.GetA<A>) => Request<never, Request.GetA<A>>
): DataSource<never, A> {
  return DataSource.fromFunctionBatchedWithEffect(name, (as) => Effect.succeed(f(as)), g)
}
