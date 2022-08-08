/**
 * Constructs a query that dies with the specified error.
 *
 * @tsplus static effect/query/Query.Ops die
 */
export function die(defect: unknown): Query<never, never, never> {
  return Query.fromEffect(Effect.die(defect))
}
