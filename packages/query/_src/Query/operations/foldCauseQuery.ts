import { _foldCauseQuery } from "@effect/query/_internal/Continue/operations/foldCauseQuery"

/**
 * A more powerful version of `foldQuery` that allows recovering from any
 * type of failure except interruptions.
 *
 * @tsplus static effect/query/Query.Aspects foldCauseQuery
 * @tsplus pipeable effect/query/Query foldCauseQuery
 */
export function foldCauseQuery<E, R2, E2, A2, A, R3, E3, A3>(
  failure: (cause: Cause<E>) => Query<R2, E2, A2>,
  success: (value: A) => Query<R3, E3, A3>
) {
  return <R>(self: Query<R, E, A>): Query<R | R2 | R3, E2 | E3, A2 | A3> =>
    _foldCauseQuery(self, failure, success)
}
