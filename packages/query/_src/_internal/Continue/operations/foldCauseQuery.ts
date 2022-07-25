import { Continue } from "@effect/query/_internal/Continue/definition"
import { Result } from "@effect/query/_internal/Result/definition"
import {
  concreteQuery,
  QueryInternal
} from "@effect/query/Query/operations/_internal/QueryInternal"
/**
 * Effectually folds over the failure and success types of this continuation.
 *
 * @tsplus static effect/query/Continue.Aspects foldCauseQuery
 * @tsplus pipeable effect/query/Continue foldCauseQuery
 */
export function foldCauseQuery<E, R2, E2, A2, A, R3, E3, A3>(
  failure: (cause: Cause<E>) => Query<R2, E2, A2>,
  success: (value: A) => Query<R3, E3, A3>
) {
  return <R>(self: Continue<R, E, A>): Continue<R | R2 | R3, E2 | E3, A2 | A3> => {
    switch (self._tag) {
      case "Eff": {
        return Continue.effect(_foldCauseQuery(self.query, failure, success))
      }
      case "Get": {
        return Continue.effect(_foldCauseQuery(Query.fromEffect(self.io), failure, success))
      }
    }
  }
}

export function _foldCauseQuery<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Query<R, E, A>,
  failure: (cause: Cause<E>) => Query<R2, E2, A2>,
  success: (value: A) => Query<R3, E3, A3>
): Query<R | R2 | R3, E2 | E3, A2 | A3> {
  concreteQuery(self)
  return new QueryInternal(
    self.step.foldCauseEffect(
      (cause) => {
        const query = failure(cause)
        concreteQuery(query)
        return query.step
      },
      (result) => {
        switch (result._tag) {
          case "Blocked": {
            return Effect.succeedNow(
              Result.blocked(
                result.blockedRequests,
                result.cont.foldCauseQuery(failure, success)
              )
            )
          }
          case "Done": {
            const query = success(result.value)
            concreteQuery(query)
            return query.step
          }
          case "Fail": {
            const query = failure(result.cause)
            concreteQuery(query)
            return query.step
          }
        }
      }
    )
  )
}
