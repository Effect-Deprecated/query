/**
 * Constructs a query that never completes.
 *
 * @tsplus static effect/query/Query.Ops never
 */
export const never: Query<never, never, never> = Query.fromEffect(Effect.never)
