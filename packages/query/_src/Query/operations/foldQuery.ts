/**
 * Recovers from errors by accepting one query to execute for the case of an
 * error, and one query to execute for the case of success.
 *
 * @tsplus static effect/query/Query.Aspects foldQuery
 * @tsplus pipeable effect/query/Query foldQuery
 */
export function foldQuery<E, R2, E2, A2, A, R3, E3, A3>(
  failure: (e: E) => Query<R2, E2, A2>,
  success: (a: A) => Query<R3, E3, A3>
) {
  return <R>(self: Query<R, E, A>): Query<R | R2 | R3, E2 | E3, A2 | A3> =>
    self.foldCauseQuery(
      (cause) => cause.failureOrCause.fold(failure, (cause) => Query.failCause(cause)),
      success
    )
}
