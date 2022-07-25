/**
 * Constructs a query that succeeds with the optional value.
 *
 * @tsplus static effect/query/Query.Ops some
 */
export function succeedSome<A>(a: LazyArg<A>): Query<never, never, Maybe<A>> {
  return Query.succeed(Maybe.some(a()))
}
