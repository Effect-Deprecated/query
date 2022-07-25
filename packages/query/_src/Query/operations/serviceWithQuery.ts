/**
 * Effectfully accesses the environment of the effect.
 *
 * @tsplus static effect/query/Query.Ops serviceWithQuery
 */
export function serviceWithQuery<T, R, E, A>(
  tag: Tag<T>,
  f: (service: T) => Query<R, E, A>
): Query<R | T, E, A> {
  return Query.service(tag).flatMap(f)
}
