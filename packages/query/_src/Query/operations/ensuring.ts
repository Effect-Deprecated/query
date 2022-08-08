/**
 * Ensures that if this query starts executing, the specified query will be
 * executed immediately after this query completes execution, whether by
 * success or failure.
 *
 * @tsplus static effect/query/Query.Aspects ensuring
 * @tsplus pipeable effect/query/Query ensuring
 */
export function ensuring<R2, X>(finalizer: Query<R2, never, X>) {
  return <R, E, A>(self: Query<R, E, A>): Query<R | R2, E, A> =>
    self.foldCauseQuery(
      (cause1) =>
        finalizer.foldCauseQuery(
          (cause2) => Query.failCause(Cause.then(cause1, cause2)),
          () => Query.failCause(cause1)
        ),
      (value) =>
        finalizer.foldCauseQuery(
          (cause) => Query.failCause(cause),
          () => Query.succeed(value)
        )
    )
}
