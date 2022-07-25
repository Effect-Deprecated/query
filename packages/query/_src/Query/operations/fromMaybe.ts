/**
 * Constructs a query from a `Maybe`.
 *
 * @tsplus static effect/query/Query.Ops fromMaybe
 */
export function fromMaybe<A>(maybe: LazyArg<Maybe<A>>): Query<never, Maybe<never>, A> {
  return Query.succeed(maybe).flatMap((maybe) => {
    switch (maybe._tag) {
      case "None": {
        return Query.fail(Maybe.none)
      }
      case "Some": {
        return Query.succeedNow(maybe.value)
      }
    }
  })
}
