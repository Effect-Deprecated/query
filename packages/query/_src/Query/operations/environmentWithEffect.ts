/**
 * Effectfully accesses the environment of the effect.
 *
 * @tsplus static effect/query/Query.Ops environmentWithEffect
 */
export function environmentWithEffect<R, R2, E, A>(
  f: (env: Env<R>) => Effect<R2, E, A>
): Query<R | R2, E, A> {
  return Query.environment<R>().mapEffect(f)
}
