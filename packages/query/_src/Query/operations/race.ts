import { Continue } from "@effect/query/_internal/Continue/definition"
import { Result } from "@effect/query/_internal/Result/definition"
import {
  concreteQuery,
  QueryInternal
} from "@effect/query/Query/operations/_internal/QueryInternal"

/**
 * Races this query with the specified query, returning the result of the
 * first to complete successfully and safely interrupting the other.
 *
 * @tsplus static effect/query/Query.Aspects race
 * @tsplus pipeable effect/query/Query race
 */
export function race<R2, E2, A2>(that: Query<R2, E2, A2>) {
  return <R, E, A>(self: Query<R, E, A>): Query<R | R2, E | E2, A | A2> => {
    concreteQuery(self)
    concreteQuery(that)
    return new QueryInternal(self.step.raceWith(
      that.step,
      coordinate,
      coordinate
    ))
  }
}

function raceInner<R, E, A, R2, E2, A2>(
  query: Query<R, E, A>,
  fiber: Fiber<never, Result<R2, E2, A2>>
): Query<R | R2, E | E2, A | A2> {
  concreteQuery(query)
  return new QueryInternal(query.step.raceWith(fiber.join, coordinate, coordinate))
}

function coordinate<R, E, A, R2, E2, A2>(
  exit: Exit<never, Result<R, E, A>>,
  fiber: Fiber<never, Result<R2, E2, A2>>
): Effect<R | R2, never, Result<R | R2, E | E2, A | A2>> {
  return exit.foldEffect(
    (cause) => fiber.join.map((result) => result.mapErrorCause((_) => Cause.both(_, cause))),
    (result) => {
      switch (result._tag) {
        case "Blocked": {
          switch (result.cont._tag) {
            case "Eff": {
              return Effect.succeed(
                Result.blocked(
                  result.blockedRequests,
                  Continue.effect(raceInner(result.cont.query, fiber))
                )
              )
            }
            case "Get": {
              return Effect.succeed(
                Result.blocked(
                  result.blockedRequests,
                  Continue.effect<R | R2, E | E2, A | A2>(
                    raceInner(Query.fromEffect(result.cont.io), fiber)
                  )
                )
              )
            }
          }
        }
        case "Done": {
          return fiber.interrupt.zipRight(Effect.succeed(Result.done(result.value)))
        }
        case "Fail": {
          return fiber.join.map((_) => _.mapErrorCause((cause) => Cause.both(cause, result.cause)))
        }
      }
    }
  )
}
