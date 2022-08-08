/**
 * The inverse operation to `Query.sandbox`.
 *
 * Terminates with exceptions on the `Left` side of the `Either` error, if it
 * exists.
 *
 * @tsplus static effect/query/Query.Ops unsandbox
 */
export function unsandbox<R, E, A>(query: Query<R, Cause<E>, A>): Query<R, E, A> {
  return query.mapErrorCause((cause) => cause.flatten)
}
