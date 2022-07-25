import type { MergeTuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Returns a query that models the execution of this query and the specified
 * query, batching requests to data sources and combining their results into
 * a flattened tuple.
 *
 * @tsplus static effect/query/Query.Aspects zipBatchedFlatten
 * @tsplus pipeable effect/query/Query zipBatchedFlatten
 */
export function zipBatchedFlatten<R2, E2, A2>(that: LazyArg<Query<R2, E2, A2>>) {
  return <R, E, A>(self: Query<R, E, A>): Query<R | R2, E | E2, MergeTuple<A, A2>> =>
    self.zipWithBatched(that, Tuple.mergeTuple)
}
