import { Result } from "@effect/query/_internal/Result/definition"

/**
 * Maps the specified function over the failure cause of this result.
 *
 * @tsplus static effect/query/Result.Aspects mapErrorCause
 * @tsplus pipeable effect/query/Result mapErrorCause
 */
export function mapErrorCause<E, E2>(f: (cause: Cause<E>) => Cause<E2>) {
  return <R, A>(self: Result<R, E, A>): Result<R, E2, A> => {
    switch (self._tag) {
      case "Blocked": {
        return Result.blocked(self.blockedRequests, self.cont.mapErrorCause(f))
      }
      case "Done": {
        return self
      }
      case "Fail": {
        return Result.fail(f(self.cause))
      }
    }
  }
}
