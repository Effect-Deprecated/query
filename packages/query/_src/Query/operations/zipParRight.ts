/**
 * Returns a query that models the execution of this query and the specified
 * query in parallel, returning the result of the specified query.
 *
 * @tsplus static effect/query/Query.Aspects zipParRight
 * @tsplus pipeable effect/query/Query zipParRight
 */
export function zipParRight<R2, E2, A2>(that: Query<R2, E2, A2>) {
  return <R, E, A>(self: Query<R, E, A>): Query<R | R2, E | E2, A2> =>
    self.zipWithPar(
      that,
      (_, a2) => a2
    )
}
