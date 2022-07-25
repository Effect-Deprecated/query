import { Result } from "@effect/query/_internal/Result/definition"

/**
 * Folds over the successful or failed result.
 *
 * @tsplus static effect/query/Result.Aspects fold
 * @tsplus pipeable effect/query/Result fold
 */
export function fold<E, A1, A, A2>(failure: (e: E) => A1, success: (a: A) => A2) {
  return <R>(self: Result<R, E, A>): Result<R, never, A1 | A2> => {
    switch (self._tag) {
      case "Blocked": {
        return Result.blocked(self.blockedRequests, self.cont.fold(failure, success))
      }
      case "Done": {
        return Result.done(success(self.value))
      }
      case "Fail": {
        return self.cause.failureOrCause.fold(
          (e) => Result.done(failure(e)),
          (c) => Result.fail(c)
        )
      }
    }
  }
}
