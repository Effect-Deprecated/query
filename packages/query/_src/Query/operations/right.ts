/**
 * "Zooms in" on the value in the `Right` side of an `Either`, moving the
 * possibility that the value is a `Left` to the error channel.
 *
 * @tsplus getter effect/query/Query right
 */
export function right<R, E, A, B>(self: Query<R, E, Either<A, B>>): Query<R, Either<A, E>, B> {
  return self.foldQuery(
    (e) => Query.fail(Either.right(e)),
    (a) => a.fold((b) => Query.fail(Either.left(b)), (c) => Query.succeedNow(c))
  )
}
