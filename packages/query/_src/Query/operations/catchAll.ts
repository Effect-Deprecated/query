/**
 * Recovers from all errors.
 *
 * @tsplus static effect/query/Query.Aspects catchAll
 * @tsplus pipeable effect/query/Query catchAll
 */
export function catchAll<E, R2, E2, A2>(f: (e: E) => Query<R2, E2, A2>) {
  return <R, A>(self: Query<R, E, A>): Query<R | R2, E2, A | A2> =>
    self.foldQuery(f, Query.succeedNow)
}
