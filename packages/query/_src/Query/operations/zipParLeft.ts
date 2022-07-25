/**
 * Returns a query that models the execution of this query and the specified
 * query in parallel, returning the result of this query.
 *
 * @tsplus static effect/query/Query.Aspects zipParLeft
 * @tsplus pipeable effect/query/Query zipParLeft
 */
export function zipParLeft<R2, E2, A2>(that: LazyArg<Query<R2, E2, A2>>) {
  return <R, E, A>(self: Query<R, E, A>): Query<R | R2, E | E2, A> =>
    self.zipWithPar(
      that,
      (a, _) => a
    )
}
