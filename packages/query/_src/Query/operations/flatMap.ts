import { flatMapQuery } from "@effect/query/_internal/Continue/operations/mapQuery"

/**
 * Returns a query that models execution of this query, followed by passing
 * its result to the specified function that returns a query. Requests
 * composed with `flatMap` or combinators derived from it will be executed
 * sequentially and will not be pipelined, though deduplication and caching of
 * requests may still be applied.
 *
 * @tsplus static effect/query/Query.Aspects flatMap
 * @tsplus pipeable effect/query/Query flatMap
 */
export function flatMap<A, R2, E2, A2>(f: (a: A) => Query<R2, E2, A2>) {
  return <R, E>(self: Query<R, E, A>): Query<R | R2, E | E2, A2> => flatMapQuery(self, f)
}
