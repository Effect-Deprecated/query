/**
 * Appends the specified optional result to the completed request map.
 *
 * @tsplus static effect/query/CompletedRequestMap.Aspects insertMaybe
 * @tsplus pipeable effect/query/CompletedRequestMap insertMaybe
 */
export function insertMaybe<E, A>(request: Request<E, A>, result: Either<E, Maybe<A>>) {
  return (self: CompletedRequestMap): CompletedRequestMap => {
    switch (result._tag) {
      case "Left": {
        return self.insert(request, Either.left(result.left) as Either<E, A>)
      }
      case "Right": {
        switch (result.right._tag) {
          case "Some": {
            return self.insert(request, Either.right(result.right) as Either<E, A>)
          }
          case "None": {
            return self
          }
        }
      }
    }
  }
}
