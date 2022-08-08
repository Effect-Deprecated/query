/**
 * Returns a query with its full cause of failure mapped using the
 * specified function. This can be used to transform errors while
 * preserving the original structure of `Cause`.
 *
 * See `sandbox`, `catchAllCause` - other functions for dealing with defects.
 *
 * @tsplus static effect/query/Query.Aspects mapErrorCause
 * @tsplus pipeable effect/query/Query mapErrorCause
 */
export function mapErrorCause<E, E2>(f: (cause: Cause<E>) => Cause<E2>) {
  return <R, A>(self: Query<R, E, A>): Query<R, E2, A> =>
    self.foldCauseQuery(
      (c) => Query.failCause(f(c)),
      Query.succeed
    )
}
