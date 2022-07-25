/**
 * Maps the specified effectual function over the result of this query.
 *
 * @tsplus static effect/query/Query.Aspects mapEffect
 * @tsplus pipeable effect/query/Query mapEffect
 */
export function mapEffect<A, R2, E2, A2>(f: (a: A) => Effect<R2, E2, A2>) {
  return <R, E>(self: Query<R, E, A>): Query<R | R2, E | E2, A2> =>
    self.flatMap((a) => Query.fromEffect(f(a)))
}
