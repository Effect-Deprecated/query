import { Continue } from "@effect/query/_internal/Continue/definition"
import { zipWithQuery } from "@effect/query/_internal/Continue/operations/zipWith"
import { Result } from "@effect/query/_internal/Result/definition"
import {
  concreteQuery,
  QueryInternal
} from "@effect/query/Query/operations/_internal/QueryInternal"
/**
 * Combines this continuation with that continuation using the specified
 * function, batching requests to data sources.
 *
 * @tsplus static effect/query/Continue.Aspects zipWithBatched
 * @tsplus pipeable effect/query/Continue zipWithBatched
 */
export function zipWithBatched<A, R2, E2, B, C>(that: Continue<R2, E2, B>, f: (a: A, b: B) => C) {
  return <R, E>(self: Continue<R, E, A>): Continue<R | R2, E | E2, C> => {
    switch (self._tag) {
      case "Eff": {
        switch (that._tag) {
          case "Eff": {
            return Continue.effect(zipWithBatchedQuery(self.query, that.query, f))
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

export function zipWithBatchedQuery<R, E, A, R2, E2, B, C>(
  self: Query<R, E, A>,
  that: Query<R2, E2, B>,
  f: (a: A, b: B) => C
): Query<R | R2, E | E2, C> {
  concreteQuery(self)
  return new QueryInternal(
    Effect.succeed(that).flatMap((that) => {
      concreteQuery(that)
      return self.step.zipWithPar(that.step, (r1, r2) => {
        switch (r1._tag) {
          case "Blocked": {
            switch (r2._tag) {
              case "Blocked": {
                return Result.blocked(
                  r1.blockedRequests.combinePar(r2.blockedRequests),
                  r1.cont.zipWithBatched(r2.cont, f)
                )
              }
              case "Done": {
                return Result.blocked(r1.blockedRequests, r1.cont.map((a) => f(a, r2.value)))
              }
              case "Fail": {
                return r2
              }
            }
          }
          case "Done": {
            switch (r2._tag) {
              case "Blocked": {
                return Result.blocked(r2.blockedRequests, r2.cont.map((b) => f(r1.value, b)))
              }
              case "Done": {
                return Result.done(f(r1.value, r2.value))
              }
              case "Fail": {
                return r2
              }
            }
          }
          case "Fail": {
            switch (r2._tag) {
              case "Blocked": {
                return r1
              }
              case "Done": {
                return r1
              }
              case "Fail": {
                return Result.fail(Cause.both(r1.cause, r2.cause))
              }
            }
          }
        }
      })
    })
  )
}
