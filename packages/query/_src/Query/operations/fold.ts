/**
 * Folds over the failed or successful result of this query to yield a query
 * that does not fail, but succeeds with the value returned by the left or
 * right function passed to `fold`.
 *
 * @tsplus static effect/query/Query.Aspects fold
 * @tsplus pipeable effect/query/Query fold
 */
export function fold<E, A2, A, A3>(failure: (e: E) => A2, success: (a: A) => A3) {
  return <R>(self: Query<R, E, A>): Query<R, never, A2 | A3> =>
    self.foldQuery(
      (e) => Query.succeed(failure(e)),
      (a) => Query.succeed(success(a))
    )
}
