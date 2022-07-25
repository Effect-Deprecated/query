/**
 * Collects a collection of queries into a query returning a collection of
 * their results, batching requests to data sources.
 *
 * @tsplus static effect/query/Query.Ops collectAllBatched
 */
export function collectAllBatched<R, E, A>(as: Collection<Query<R, E, A>>): Query<R, E, Chunk<A>> {
  return Query.forEachBatched(as, identity)
}
