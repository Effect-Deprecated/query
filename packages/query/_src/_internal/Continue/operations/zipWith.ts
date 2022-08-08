import { Continue } from "@effect/query/_internal/Continue/definition"
import { flatMapQuery } from "@effect/query/_internal/Continue/operations/mapQuery"
import { Result } from "@effect/query/_internal/Result/definition"
import {
  concreteQuery,
  QueryInternal
} from "@effect/query/Query/operations/_internal/QueryInternal"
/**
 * Combines this continuation with that continuation using the specified
 * function, in sequence.
 *
 * @tsplus static effect/query/Continue.Aspects zipWith
 * @tsplus pipeable effect/query/Continue zipWith
 */
export function zipWith<A, R2, E2, B, C>(that: Continue<R2, E2, B>, f: (a: A, b: B) => C) {
  return <R, E>(self: Continue<R, E, A>): Continue<R | R2, E | E2, C> => {
    switch (self._tag) {
      case "Eff": {
        switch (that._tag) {
          case "Eff": {
            return Continue.effect(zipWithQuery(self.query, that.query, f))
          }
          case "Get": {
            return Continue.effect(zipWithQuery(self.query, Query.fromEffect(that.io), f))
          }
        }
      }
      case "Get": {
        switch (that._tag) {
          case "Eff": {
            return Continue.effect(zipWithQuery(Query.fromEffect(self.io), that.query, f))
          }
          case "Get": {
            return Continue.get(self.io.zipWith(that.io, f))
          }
        }
      }
    }
  }
}

export function zipWithQuery<R, E, A, R2, E2, B, C>(
  self: Query<R, E, A>,
  that: Query<R2, E2, B>,
  f: (a: A, b: B) => C
): Query<R | R2, E | E2, C> {
  return flatMapQuery(Query.succeed(that), (that) => {
    concreteQuery(self)
    concreteQuery(that)
    return new QueryInternal(
      self.step.flatMap((result) => {
        switch (result._tag) {
          case "Blocked": {
            switch (result.cont._tag) {
              case "Eff": {
                return Effect.succeed(
                  Result.blocked(
                    result.blockedRequests,
                    Continue.effect(zipWithQuery(result.cont.query, that, f))
                  )
                )
              }
              case "Get": {
                return that.step.map((result2) => {
                  switch (result2._tag) {
                    case "Blocked": {
                      return Result.blocked(
                        result.blockedRequests.combineSeq(result2.blockedRequests),
                        result.cont.zipWith(result2.cont, f)
                      )
                    }
                    case "Done": {
                      return Result.blocked(
                        result.blockedRequests,
                        result.cont.map((a) => f(a, result2.value))
                      )
                    }
                    case "Fail": {
                      return Result.fail(result2.cause)
                    }
                  }
                })
              }
            }
          }
          case "Done": {
            return that.step.map((result2) => {
              switch (result2._tag) {
                case "Blocked": {
                  return Result.blocked(
                    result2.blockedRequests,
                    result2.cont.map((b) => f(result.value, b))
                  )
                }
                case "Done": {
                  return Result.done(f(result.value, result2.value))
                }
                case "Fail": {
                  return Result.fail(result2.cause)
                }
              }
            })
          }
          case "Fail": {
            return Effect.succeed(Result.fail(result.cause))
          }
        }
      })
    )
  })
}
