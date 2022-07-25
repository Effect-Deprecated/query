/**
 * Expose the full cause of failure of this query.
 *
 * @tsplus getter effect/query/Query sandbox
 */
export function sandbox<R, E, A>(self: Query<R, E, A>): Query<R, Cause<E>, A> {
  return self.foldCauseQuery((e) => Query.fail(e), (a) => Query.succeed(a))
}
