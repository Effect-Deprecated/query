/**
 * Accesses the whole environment of the query.
 *
 * @tsplus static effect/query/Query.Ops service
 */
export function service<T>(tag: Tag<T>): Query<T, never, T> {
  return Query.fromEffect(Effect.service(tag))
}
