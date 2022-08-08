import { Result } from "@effect/query/_internal/Result/definition"
import { QueryInternal } from "@effect/query/Query/operations/_internal/QueryInternal"

/**
 * Constructs a query that fails with the specified error.
 *
 * @tsplus static effect/query/Query.Ops failSync
 */
export function failSync<E>(error: LazyArg<E>): Query<never, E, never> {
  return new QueryInternal(Effect.sync(error).map(e => Result.fail(Cause.fail(e))))
}
