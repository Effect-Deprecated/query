/**
 * Constructs a query from a `Maybe`.
 *
 * @tsplus static effect/query/Query.Ops fromMaybe
 */
export function fromMaybe<A>(maybe: Maybe<A>): Query<never, Maybe<never>, A> {
  switch (maybe._tag) {
    case "None": {
      return Query.fail(Maybe.none)
    }
    case "Some": {
      return Query.succeed(maybe.value)
    }
  }
}
