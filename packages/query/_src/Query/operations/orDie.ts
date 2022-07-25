/**
 * Converts this query to one that dies if a query failure occurs.
 *
 * @tsplus getter effect/query/Query orDie
 */
export function orDie<R, E, A>(self: Query<R, E, A>): Query<R, never, A> {
  return self.orDieWith(identity)
}
