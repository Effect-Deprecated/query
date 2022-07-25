import { provideSomeEnvironmentResult } from "@effect/query/_internal/Continue/operations/provideSomeEnvironment"
import type { Result } from "@effect/query/_internal/Result/definition"

/**
 * Provides this result with part of its required environment.
 *
 * @tsplus static effect/query/Result.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/query/Result provideSomeEnvironment
 */
export function provideSomeEnvironment<R0, R>(f: Described<(env: Env<R0>) => Env<R>>) {
  return <E, A>(self: Result<R, E, A>): Result<R0, E, A> => provideSomeEnvironmentResult(self, f)
}
