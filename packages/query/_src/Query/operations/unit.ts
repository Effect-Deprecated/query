/**
 * The query that succeeds with the unit value.
 *
 * @tsplus static effect/query/Query.Ops unit
 */
export const unit: Query<never, never, void> = Query.succeed(undefined)
