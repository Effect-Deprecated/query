/**
 * Extracts the optional value or succeeds with the given 'default' value.
 *
 * @tsplus static effect/query/Query.Aspects someOrElse
 * @tsplus pipeable effect/query/Query someOrElse
 */
export function someOrElse<B>(def: LazyArg<B>) {
  return <R, E, A>(self: Query<R, E, Maybe<A>>): Query<R, E, A | B> =>
    self.map((maybe) => maybe.getOrElse(def))
}
