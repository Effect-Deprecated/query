/**
 * Converts a `Query<R, Either<B, E>, A>` into a
 * `Query<R, E, Either<B, A>>`. The inverse of `right`.
 *
 * @tsplus getter effect/query/Query unright
 */
export function unright<R, E, A, B>(self: Query<R, Either<B, E>, A>): Query<R, E, Either<B, A>> {
  return self.foldQuery(
    (e) => e.fold((b) => Query.succeed(Either.left(b)), (e) => Query.fail(e)),
    (a) => Query.succeed(Either.right(a))
  )
}
