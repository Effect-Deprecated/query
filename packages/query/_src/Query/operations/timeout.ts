/**
 * Returns an effect that will timeout this query, returning `None` if the
 * timeout elapses before the query was completed.
 *
 * @tsplus static effect/query/Query.Aspects timeout
 * @tsplus pipeable effect/query/Query timeout
 */
export function timeout(duration: LazyArg<Duration>) {
  return <R, E, A>(self: Query<R, E, A>): Query<R, E, Maybe<A>> =>
    self.timeoutTo(Maybe.none, Maybe.some, duration)
}
