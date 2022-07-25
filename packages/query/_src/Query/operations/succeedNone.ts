/**
 * Constructs a query that succeds with the empty value.
 *
 * @tsplus static effect/query/Query.Ops none
 */
export const none: Query<never, never, Maybe<never>> = Query.succeedNow(Maybe.none)
