/**
 * Converts a `Query<R, Either<E, B>, A>` into a
 * `Query<R, E, Either<A, B>>`. The inverse of `left`.
 *
 * @tsplus getter effect/query/Query unleft
 */
export function unleft<R, E, A, B>(self: Query<R, Either<E, B>, A>): Query<R, E, Either<A, B>> {
  return self.foldQuery(
    (e) => e.fold((e1) => Query.fail(e1), (b) => Query.succeedNow(Either.right(b))),
    (a) => Query.succeedNow(Either.left(a))
  )
}
