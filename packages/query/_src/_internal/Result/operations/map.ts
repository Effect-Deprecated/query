import { mapResult } from "@effect/query/_internal/Continue/operations/map"
import type { Result } from "@effect/query/_internal/Result/definition"

/**
 * Maps the specified function over the successful value of this result.
 *
 * @tsplus static effect/query/Result.Aspects map
 * @tsplus pipeable effect/query/Result map
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: Result<R, E, A>): Result<R, E, B> => mapResult(self, f)
}
