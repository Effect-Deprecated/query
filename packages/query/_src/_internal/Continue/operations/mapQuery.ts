import { Continue } from "@effect/query/_internal/Continue/definition"
import { Result } from "@effect/query/_internal/Result/definition"
import {
  concreteQuery,
  QueryInternal
} from "@effect/query/Query/operations/_internal/QueryInternal"
/**
 * Effectually maps over the success type of this continuation.
 *
 * @tsplus static effect/query/Continue.Aspects mapQuery
 * @tsplus pipeable effect/query/Continue mapQuery
 */
export function mapQuery<A, R2, E2, A2>(f: (a: A) => Query<R2, E2, A2>) {
  return <R, E>(self: Continue<R, E, A>): Continue<R | R2, E | E2, A2> => {
    switch (self._tag) {
      case "Eff": {
        return Continue.effect(flatMapQuery(self.query, f))
      }
      case "Get": {
        return Continue.effect(flatMapQuery(Query.fromEffect(self.io), f))
      }
    }
  }
}

export function flatMapQuery<R, E, A, R2, E2, A2>(
  self: Query<R, E, A>,
  f: (a: A) => Query<R2, E2, A2>
): Query<R | R2, E | E2, A2> {
  concreteQuery(self)
  return new QueryInternal(
    self.step.flatMap((result) => {
      switch (result._tag) {
        case "Blocked": {
          return Effect.succeed(
            Result.blocked(result.blockedRequests, result.cont.mapQuery(f))
          )
        }
        case "Done": {
          const query = f(result.value)
          concreteQuery(query)
          return query.step
        }
        case "Fail": {
          return Effect.succeed(Result.fail(result.cause))
        }
      }
    })
  )
}
