/**
 * Accesses the environment of the effect.
 *
 * @tsplus static effect/query/Query.Ops environmentWith
 */
export function environmentWith<R, A>(f: (env: Env<R>) => A): Query<R, never, A> {
  return Query.environment<R>().map(f)
}
