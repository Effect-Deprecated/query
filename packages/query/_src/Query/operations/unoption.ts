/**
 * Converts a maybe on errors into a maybe on values.
 *
 * @tsplus getter effect/query/Query unoption
 */
export function unmaybe<R, E, A>(self: Query<R, Maybe<E>, A>): Query<R, E, Maybe<A>> {
  return self.foldQuery(
    (e) => e.fold(Query.succeedNow(Maybe.none), (e) => Query.fail(e)),
    (a) => Query.succeedNow(Maybe.some(a))
  )
}
