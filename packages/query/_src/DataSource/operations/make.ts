import { DataSourceInternal } from "@effect/query/DataSource/operations/_internal/DataSourceInternal"

/**
 * Constructs a data source from a function taking a collection of requests
 * and returning a `CompletedRequestMap`.
 *
 * @tsplus static effect/query/DataSource.Ops make
 */
export function make<R, A>(
  identifier: string,
  runAll: (requests: Chunk<Chunk<A>>) => Effect<R, never, CompletedRequestMap>
): DataSource<R, A> {
  return new DataSourceInternal(identifier, runAll)
}
