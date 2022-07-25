/**
 * "Zooms in" on the value in the `Left` side of an `Either`, moving the
 * possibility that the value is a `Right` to the error channel.
 *
 * @tsplus getter effect/query/Query left
 */
export function left<R, E, A, B>(self: Query<R, E, Either<A, B>>): Query<R, Either<E, B>, A> {
  return self.foldQuery(
    (e) => Query.fail(Either.left(e)),
    (a) => a.fold(Query.succeedNow, (c) => Query.fail(Either.right(c)))
  )
}
