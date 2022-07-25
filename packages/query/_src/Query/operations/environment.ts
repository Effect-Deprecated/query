/**
 * Accesses the whole environment of the query.
 *
 * @tsplus static effect/query/Query.Ops environment
 */
export function environment<R = never>(): Query<R, never, Env<R>> {
  return Query.fromEffect(Effect.environment<R>())
}
