/**
 * Companion helper to `sandbox`. Allows recovery, and partial recovery, from
 * errors and defects alike.
 *
 * @tsplus static effect/query/Query.Aspects sandboxWith
 * @tsplus pipeable effect/query/Query sandboxWith
 */
export function sandboxWith<R, E, A, R2, E2, A2>(
  f: (query: Query<R, Cause<E>, A>) => Query<R2, Cause<E2>, A2>
) {
  return (self: Query<R, E, A>): Query<R | R2, E2, A2> => Query.unsandbox(f(self.sandbox))
}
