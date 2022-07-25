/**
 * Keeps some of the errors, and terminates the query with the rest
 *
 * @tsplus static effect/query/Query.Aspects refineOrDie
 * @tsplus pipeable effect/query/Query refineOrDie
 */
export function refineOrDie<E, E2>(pf: (e: E) => Maybe<E2>) {
  return <R, A>(self: Query<R, E, A>): Query<R, E2, A> => self.refineOrDieWith(pf, identity)
}
