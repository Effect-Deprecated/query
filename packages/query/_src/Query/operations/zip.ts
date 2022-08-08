/**
 * Returns a query that models the execution of this query and the specified
 * query sequentially, combining their results into a tuple.
 *
 * @tsplus static effect/query/Query.Aspects zip
 * @tsplus pipeable effect/query/Query zip
 */
export function zip<R2, E2, A2>(that: Query<R2, E2, A2>) {
  return <R, E, A>(self: Query<R, E, A>): Query<R | R2, E | E2, Tuple<[A, A2]>> =>
    self.zipWith(that, (a, b) => Tuple(a, b))
}
