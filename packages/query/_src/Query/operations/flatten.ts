/**
 * Returns a query that performs the outer query first, followed by the inner
 * query, yielding the value of the inner query.
 *
 * This method can be used to "flatten" nested queries.
 *
 * @tsplus static effect/query/Query.Ops flatten
 * @tsplus getter effect/query/Query flatten
 */
export function flatten<R, E, R2, E2, A>(
  self: Query<R, E, Query<R2, E2, A>>
): Query<R | R2, E | E2, A> {
  return self.flatMap(identity)
}
