/**
 * Converts this query to one that dies if a query failure occurs, using the
 * specified function to map the error to a defect.
 *
 * @tsplus static effect/query/Query.Aspects orDieWith
 * @tsplus pipeable effect/query/Query orDieWith
 */
export function orDieWith<E>(f: (e: E) => unknown) {
  return <R, A>(self: Query<R, E, A>): Query<R, never, A> =>
    self.foldQuery((e) => Query.die(f(e)), Query.succeed)
}
