import { zipWithQuery } from "@effect/query/_internal/Continue/operations/zipWith"

/**
 * Returns a query that models the execution of this query and the specified
 * query sequentially, combining their results with the specified function.
 * Requests composed with `zipWith` or combinators derived from it will
 * automatically be pipelined.
 *
 * @tsplus static effect/query/Query.Aspects zipWith
 * @tsplus pipeable effect/query/Query zipWith
 */
export function zipWith<R2, E2, B, A, C>(that: Query<R2, E2, B>, f: (a: A, b: B) => C) {
  return <R, E>(self: Query<R, E, A>): Query<R | R2, E | E2, C> => zipWithQuery(self, that, f)
}
