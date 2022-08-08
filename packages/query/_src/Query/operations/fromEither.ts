/**
 * Constructs a query from an `Either`.
 *
 * @tsplus static effect/query/Query.Ops fromEither
 */
export function fromEither<E, A>(either: Either<E, A>): Query<never, E, A> {
  switch (either._tag) {
    case "Left": {
      return Query.fail(either.left)
    }
    case "Right": {
      return Query.succeed(either.right)
    }
  }
}
