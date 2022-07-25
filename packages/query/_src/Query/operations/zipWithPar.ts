import { zipWithParQuery } from "@effect/query/_internal/Continue/operations/zipWithPar"

/**
 * Returns a query that models the execution of this query and the specified
 * query in parallel, combining their results with the specified function.
 * Requests composed with `zipWithPar` or combinators derived from it will
 * automatically be batched.
 *
 * @tsplus static effect/query/Query.Aspects zipWithPar
 * @tsplus pipeable effect/query/Query zipWithPar
 */
export function zipWithPar<R2, E2, B, A, C>(that: LazyArg<Query<R2, E2, B>>, f: (a: A, b: B) => C) {
  return <R, E>(self: Query<R, E, A>): Query<R | R2, E | E2, C> => zipWithParQuery(self, that, f)
}
