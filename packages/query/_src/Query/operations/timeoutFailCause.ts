/**
 * The same as `Query.timeout`, but instead of producing a `None` in the event
 * of timeout, it will produce the specified failure.
 *
 * @tsplus static effect/query/Query.Aspects timeoutFailCause
 * @tsplus pipeable effect/query/Query timeoutFailCause
 */
export function timeoutFailCause<E1>(cause: LazyArg<Cause<E1>>, duration: Duration) {
  return <R, E, A>(self: Query<R, E, A>): Query<R, E | E1, A> =>
    self.timeoutTo(Query.failCauseSync(cause), Query.succeed, duration).flatten
}
