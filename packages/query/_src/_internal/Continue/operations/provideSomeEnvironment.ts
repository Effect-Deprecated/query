import { Continue } from "@effect/query/_internal/Continue/definition"
import { Result } from "@effect/query/_internal/Result/definition"
import {
  concreteQuery,
  QueryInternal
} from "@effect/query/Query/operations/_internal/QueryInternal"
/**
 * Purely contramaps over the environment type of this continuation.
 *
 * @tsplus static effect/query/Continue.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/query/Continue provideSomeEnvironment
 */
export function provideSomeEnvironment<R0, R>(f: Described<(env: Env<R0>) => Env<R>>) {
  return <E, A>(self: Continue<R, E, A>): Continue<R0, E, A> => {
    switch (self._tag) {
      case "Eff": {
        return Continue.effect(provideSomeEnvironmentQuery(self.query, f))
      }
      case "Get": {
        return self
      }
    }
  }
}

export function provideSomeEnvironmentResult<R, E, A, R0>(
  self: Result<R, E, A>,
  f: Described<(env: Env<R0>) => Env<R>>
): Result<R0, E, A> {
  switch (self._tag) {
    case "Blocked": {
      return Result.blocked(
        self.blockedRequests.provideSomeEnvironment(f),
        self.cont.provideSomeEnvironment(f)
      )
    }
    case "Done": {
      return self
    }
    case "Fail": {
      return self
    }
  }
}

export function provideSomeEnvironmentQuery<R, E, A, R0>(
  self: Query<R, E, A>,
  f: Described<(env: Env<R0>) => Env<R>>
): Query<R0, E, A> {
  concreteQuery(self)
  return new QueryInternal(
    self.step
      .map((result) => provideSomeEnvironmentResult(result, f))
      .provideSomeEnvironment((r) => f.value(r))
  )
}
