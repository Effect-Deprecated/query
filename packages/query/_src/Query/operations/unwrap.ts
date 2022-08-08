/**
 * Unwraps a query that is produced by an effect.
 *
 * @tsplus static effect/query/Query.Ops unwrap
 */
export function unwrap<R, E, R2, E2, A>(
  effect: Effect<R, E, Query<R2, E2, A>>
): Query<R | R2, E | E2, A> {
  return Query.fromEffect(effect).flatten
}
