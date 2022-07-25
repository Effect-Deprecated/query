/**
 * Maps the specified function over the failed result of this query.
 *
 * @tsplus static effect/query/Query.Aspects mapError
 * @tsplus pipeable effect/query/Query mapError
 */
export function mapError<E, E2>(f: (e: E) => E2) {
  return <R, A>(self: Query<R, E, A>): Query<R, E2, A> => self.mapBoth(f, identity)
}
