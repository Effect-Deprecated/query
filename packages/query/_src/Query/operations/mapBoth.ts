/**
 * Returns a query whose failure and success channels have been mapped by the
 * specified pair of functions, `f` and `g`.
 *
 * @tsplus static effect/query/Query.Aspects mapBoth
 * @tsplus pipeable effect/query/Query mapBoth
 */
export function mapBoth<E, E2, A, A2>(f: (e: E) => E2, g: (a: A) => A2) {
  return <R>(self: Query<R, E, A>): Query<R, E2, A2> =>
    self.foldQuery(
      (e) => Query.fail(f(e)),
      (a) => Query.succeed(g(a))
    )
}
