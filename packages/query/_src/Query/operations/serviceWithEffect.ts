/**
 * Effectfully accesses the environment of the effect.
 *
 * @tsplus static effect/query/Query.Ops serviceWithEffect
 */
export function serviceWithEffect<T, R, E, A>(
  tag: Tag<T>,
  f: (service: T) => Effect<R, E, A>
): Query<R | T, E, A> {
  return Query.service(tag).mapEffect(f)
}
