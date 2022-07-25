/**
 * Returns a query that models the execution of this query and the specified
 * query, batching requests to data sources and returning the result of the
 * specified query.
 *
 * @tsplus static effect/query/Query.Aspects zipBatchedRight
 * @tsplus pipeable effect/query/Query zipBatchedRight
 */
export function zipBatchedRight<R2, E2, A2>(that: LazyArg<Query<R2, E2, A2>>) {
  return <R, E, A>(self: Query<R, E, A>): Query<R | R2, E | E2, A2> =>
    self.zipWithBatched(that, (_, a2) => a2)
}
