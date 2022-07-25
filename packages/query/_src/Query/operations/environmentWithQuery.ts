/**
 * Effectfully accesses the environment of the effect.
 *
 * @tsplus static effect/query/Query.Ops environmentWithQuery
 */
export function environmentWithQuery<R, R2, E, A>(
  f: (env: Env<R>) => Query<R2, E, A>
): Query<R | R2, E, A> {
  return Query.environment<R>().flatMap(f)
}
