/**
 * The same as `Query.timeout`, but instead of producing a `None` in the event
 * of timeout, it will produce the specified error.
 *
 * @tsplus static effect/query/Query.Aspects timeoutFail
 * @tsplus pipeable effect/query/Query timeoutFail
 */
export function timeoutFail<E1>(e: LazyArg<E1>, duration: LazyArg<Duration>) {
  return <R, E, A>(self: Query<R, E, A>): Query<R, E | E1, A> =>
    self.timeoutTo(Query.fail(e), Query.succeedNow, duration).flatten
}
