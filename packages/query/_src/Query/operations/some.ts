/**
 * Extracts a Some value into the value channel while moving the None into the error channel for easier composition
 *
 * Inverse of `Query.unoption`.
 *
 * @tsplus getter effect/query/Query some
 */
export function some<R, E, A>(self: Query<R, E, Maybe<A>>): Query<R, Maybe<E>, A> {
  return self.foldQuery(
    (e) => Query.fail(Maybe.some(e)),
    (a) => a.fold(Query.fail(Maybe.none), Query.succeedNow)
  )
}
