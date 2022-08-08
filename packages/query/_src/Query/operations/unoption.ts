/**
 * Converts a maybe on errors into a maybe on values.
 *
 * @tsplus getter effect/query/Query unoption
 */
export function unmaybe<R, E, A>(self: Query<R, Maybe<E>, A>): Query<R, E, Maybe<A>> {
  return self.foldQuery(
    (e) => e.fold(Query.succeed(Maybe.none), (e) => Query.fail(e)),
    (a) => Query.succeed(Maybe.some(a))
  )
}
