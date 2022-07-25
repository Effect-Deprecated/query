/**
 * Constructs a query from an `Either`.
 *
 * @tsplus static effect/query/Query.Ops fromEither
 */
export function fromEither<E, A>(either: LazyArg<Either<E, A>>): Query<never, E, A> {
  return Query.succeed(either).flatMap((either) => {
    switch (either._tag) {
      case "Left": {
        return Query.fail(either.left)
      }
      case "Right": {
        return Query.succeedNow(either.right)
      }
    }
  })
}
