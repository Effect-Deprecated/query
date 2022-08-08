/**
 * Extracts the optional value or executes the given 'default' query.
 *
 * @tsplus static effect/query/Query.Aspects someOrElseQuery
 * @tsplus pipeable effect/query/Query someOrElseQuery
 */
export function someOrElseQuery<R2, E2, A2>(def: LazyArg<Query<R2, E2, A2>>) {
  return <R, E, A>(self: Query<R, E, Maybe<A>>): Query<R | R2, E | E2, A | A2> =>
    self.flatMap((maybe) => {
      switch (maybe._tag) {
        case "Some": {
          return Query.succeed(maybe.value)
        }
        case "None": {
          return Query.suspend(def)
        }
      }
    })
}
