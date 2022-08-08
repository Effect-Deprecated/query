import { Continue } from "@effect/query/_internal/Continue"
import { Result } from "@effect/query/_internal/Result"
import {
  concreteQuery,
  QueryInternal
} from "@effect/query/Query/operations/_internal/QueryInternal"

/**
 * Returns a query that will timeout this query, returning either the default
 * value if the timeout elapses before the query has completed or the result
 * of applying the function `f` to the successful result of the query.
 *
 * @tsplus static effect/query/Query.Aspects timeoutTo
 * @tsplus pipeable effect/query/Query timeoutTo
 */
export function timeoutTo<A, B, B1>(def: LazyArg<B>, f: (a: A) => B1, duration: LazyArg<Duration>) {
  return <R, E>(self: Query<R, E, A>): Query<R, E, B | B1> =>
    Query
      .fromEffect(Effect.sleep(duration).interruptible.as(def).fork)
      .flatMap((fiber) => race(self.map(f), fiber))
}

function race<R, E, A, B>(
  query: Query<R, E, A>,
  fiber: Fiber<never, B>
): Query<R, E, A | B> {
  concreteQuery(query)
  return new QueryInternal(
    query.step.raceWith(
      fiber.join,
      (leftExit, rightFiber) =>
        leftExit.foldEffect(
          (cause) => rightFiber.interrupt.zipRight(Effect.succeed(Result.fail(cause))),
          (result) => {
            switch (result._tag) {
              case "Blocked": {
                switch (result.cont._tag) {
                  case "Eff": {
                    return Effect.succeed(
                      Result.blocked(
                        result.blockedRequests,
                        Continue.effect(race(result.cont.query, rightFiber))
                      )
                    )
                  }
                  case "Get": {
                    return Effect.succeed(
                      Result.blocked(
                        result.blockedRequests,
                        Continue.effect(race(Query.fromEffect(result.cont.io), rightFiber))
                      )
                    )
                  }
                }
              }
              case "Done": {
                return rightFiber.interrupt.zipRight(Effect.succeed(Result.done(result.value)))
              }
              case "Fail": {
                return rightFiber.interrupt.zipRight(Effect.succeed(Result.fail(result.cause)))
              }
            }
          }
        ),
      (rightExit, leftFiber) =>
        leftFiber.interrupt.zipRight(Effect.succeed(Result.fromExit(rightExit)))
    )
  )
}
