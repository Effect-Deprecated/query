/**
 * Summarizes a query by computing some value before and after execution,
 * and then combining the values to produce a summary, together with the
 * result of execution.
 *
 * @tsplus static effect/query/Query.Aspects summarized
 * @tsplus pipeable effect/query/Query summarized
 */
export function summarized<R2, E2, B, C>(summary: Effect<R2, E2, B>, f: (b1: B, b2: B) => C) {
  return <R, E, A>(self: Query<R, E, A>): Query<R | R2, E | E2, Tuple<[C, A]>> =>
    Query.suspend(() =>
      Do(($) => {
        const start = $(Query.fromEffect(summary))
        const value = $(self)
        const end = $(Query.fromEffect(summary))
        return Tuple(f(start, end), value)
      })
    )
}
