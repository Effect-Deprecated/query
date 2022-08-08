/**
 * Extracts the optional value or fails with the given error `e`.
 *
 * @tsplus static effect/query/Query.Aspects someOrFail
 * @tsplus pipeable effect/query/Query someOrFail
 */
export function someOrFail<E2>(e: LazyArg<E2>) {
  return <R, E, A>(self: Query<R, E, Maybe<A>>): Query<R, E | E2, A> =>
    self.flatMap((maybe) => {
      switch (maybe._tag) {
        case "Some": {
          return Query.succeed(maybe.value)
        }
        case "None": {
          return Query.failSync(e)
        }
      }
    })
}
