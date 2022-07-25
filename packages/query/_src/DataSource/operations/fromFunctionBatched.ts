import type { Request } from "@effect/query/Request"

/**
 * Constructs a data source from a pure function that takes a list of
 * requests and returns a list of results of the same size. Each item in the
 * result list must correspond to the item at the same index in the request
 * list.
 *
 * @tsplus static effect/query/DataSource.Ops fromFunctionBatched
 */
export function fromFunctionBatched<A extends Request<any, any>>(
  name: string,
  f: (requests: Chunk<A>) => Chunk<Request.GetA<A>>
): DataSource<never, A> {
  return DataSource.fromFunctionBatchedEffect(name, (as) => Effect.succeedNow(f(as)))
}
