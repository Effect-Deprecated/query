/**
 * Accesses the environment of the effect.
 *
 * @tsplus static effect/query/Query.Ops serviceWith
 */
export function serviceWith<T, A>(tag: Tag<T>, f: (service: T) => A): Query<T, never, A> {
  return Query.service(tag).map(f)
}
