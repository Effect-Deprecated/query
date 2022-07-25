import { Result } from "@effect/query/_internal/Result/definition"

/**
 * Maps the specified function over the failed value of this result.
 *
 * @tsplus static effect/query/Result.Aspects mapError
 * @tsplus pipeable effect/query/Result mapError
 */
export function mapError<E, E2>(f: (e: E) => E2) {
  return <R, A>(self: Result<R, E, A>): Result<R, E2, A> => {
    switch (self._tag) {
      case "Blocked": {
        return Result.blocked(self.blockedRequests, self.cont.mapError(f))
      }
      case "Done": {
        return self
      }
      case "Fail": {
        return Result.fail(self.cause.map(f))
      }
    }
  }
}
