/**
 * Returns a query whose failure and success have been lifted into an
 * `Either`. The resulting query cannot fail, because the failure case has
 * been exposed as part of the `Either` success case.
 *
 * @tsplus getter effect/query/Query either
 */
export function either<R, E, A>(self: Query<R, E, A>): Query<R, never, Either<E, A>> {
  return self.fold(Either.left, Either.right)
}
