import { zipWithBatchedQuery } from "@effect/query/_internal/Continue/operations/zipWithBatched"

/**
 * Returns a query that models the execution of this query and the specified
 * query, batching requests to data sources.
 *
 * @tsplus static effect/query/Query.Aspects zipWithBatched
 * @tsplus pipeable effect/query/Query zipWithBatched
 */
export function zipWithBatched<R2, E2, B, A, C>(
  that: Query<R2, E2, B>,
  f: (a: A, b: B) => C
) {
  return <R, E>(self: Query<R, E, A>): Query<R | R2, E | E2, C> =>
    zipWithBatchedQuery(self, that, f)
}
