import type { Request } from "@effect/query/Request"

/**
 * Constructs a data source from a pure function that takes a list of
 * requests and returns a list of optional results of the same size. Each
 * item in the result list must correspond to the item at the same index in
 * the request list.
 *
 * @tsplus static effect/query/DataSource.Ops fromFunctionBatchedMaybe
 */
export function fromFunctionBatchedMaybe<A extends Request<any, any>>(
  name: string,
  f: (requests: Chunk<A>) => Chunk<Maybe<Request.GetA<A>>>
): DataSource<never, A> {
  return DataSource.fromFunctionBatchedMaybeEffect(name, (as) => Effect.succeedNow(f(as)))
}
