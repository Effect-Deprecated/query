/**
 * Keeps some of the errors, and terminates the query with the rest, using
 * the specified function to convert the `E` into a defect.
 *
 * @tsplus static effect/query/Query.Aspects refineOrDieWith
 * @tsplus pipeable effect/query/Query refineOrDieWith
 */
export function refineOrDieWith<E, E2>(pf: (e: E) => Maybe<E2>, f: (e: E) => unknown) {
  return <R, A>(self: Query<R, E, A>): Query<R, E2, A> =>
    self.catchAll((e) => pf(e).fold(Query.die(f(e)), (e2) => Query.fail(e2)))
}
