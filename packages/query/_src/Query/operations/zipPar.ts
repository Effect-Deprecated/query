/**
 * Returns a query that models the execution of this query and the specified
 * query in parallel, combining their results into a tuple.
 *
 * @tsplus static effect/query/Query.Aspects zipPar
 * @tsplus pipeable effect/query/Query zipPar
 */
export function zipPar<R2, E2, A2>(that: Query<R2, E2, A2>) {
  return <R, E, A>(self: Query<R, E, A>): Query<R | R2, E | E2, Tuple<[A, A2]>> =>
    self.zipWithPar(
      that,
      (a, a2) => Tuple(a, a2)
    )
}
