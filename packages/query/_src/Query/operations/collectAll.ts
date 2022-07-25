/**
 * Collects a collection of queries into a query returning a collection of
 * their results. Requests will be executed sequentially and will be
 * pipelined.
 *
 * @tsplus static effect/query/Query.Ops collectAll
 */
export function collectAll<R, E, A>(as: Collection<Query<R, E, A>>): Query<R, E, Chunk<A>> {
  return Query.forEach(as, identity)
}
