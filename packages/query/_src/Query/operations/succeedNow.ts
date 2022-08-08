import { Result } from "@effect/query/_internal/Result/definition"
import { QueryInternal } from "@effect/query/Query/operations/_internal/QueryInternal"

/**
 * Constructs a query that succeeds with the specified value.
 *
 * @tsplus static effect/query/Query.Ops succeedNow
 */
export function succeedNow<A>(value: A): Query<never, never, A> {
  return new QueryInternal(Effect.succeed(Result.done(value)))
}
