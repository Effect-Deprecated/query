/**
 * Lifts the error channel into a `Some` value for composition with other optional queries
 *
 * See `Query.some`.
 *
 * @tsplus getter effect/query/Query asSomeError
 */
export function asSomeError<R, E, A>(self: Query<R, E, A>): Query<R, Maybe<E>, A> {
  return self.mapError(Maybe.some)
}
