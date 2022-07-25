import { Result } from "@effect/query/_internal/Result/definition"
import { QueryInternal } from "@effect/query/Query/operations/_internal/QueryInternal"

/**
 * Constructs a query from an effect.
 *
 * @tsplus static effect/query/Query.Ops fromEffect
 */
export function fromEffect<R, E, A>(effect: LazyArg<Effect<R, E, A>>): Query<R, E, A> {
  return new QueryInternal(Effect.suspendSucceed(effect).foldCause(Result.fail, Result.done))
}
