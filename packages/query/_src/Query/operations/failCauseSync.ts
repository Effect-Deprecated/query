import { Result } from "@effect/query/_internal/Result/definition"
import { QueryInternal } from "@effect/query/Query/operations/_internal/QueryInternal"

/**
 * Constructs a query that fails with the specified cause.
 *
 * @tsplus static effect/query/Query.Ops failCauseSync
 */
export function failCauseSync<E>(cause: LazyArg<Cause<E>>): Query<never, E, never> {
  return new QueryInternal(Effect.sync(cause).map(c => Result.fail(c)))
}
