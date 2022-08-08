/**
 * Recovers from all errors with provided Cause.
 *
 * See `Query.sandbox - other functions that can recover from defects.
 *
 * @tsplus static effect/query/Query.Aspects catchAllCause
 * @tsplus pipeable effect/query/Query catchAllCause
 */
export function catchAllCause<E, R2, E2, A2>(f: (cause: Cause<E>) => Query<R2, E2, A2>) {
  return <R, A>(self: Query<R, E, A>): Query<R | R2, E2, A | A2> =>
    self.foldCauseQuery(f, Query.succeed)
}
