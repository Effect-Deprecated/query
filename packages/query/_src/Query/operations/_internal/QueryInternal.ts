import type { Result } from "@effect/query/_internal/Result"
import type { Query } from "@effect/query/Query/definition"
import { _A, _E, _R, QuerySym } from "@effect/query/Query/definition"

export class QueryInternal<R, E, A> implements Query<R, E, A> {
  readonly [QuerySym]: QuerySym = QuerySym
  readonly [_R]!: () => R
  readonly [_E]!: () => E
  readonly [_A]!: () => A
  constructor(readonly step: Effect<R, never, Result<R, E, A>>) {}
}

/**
 * @tsplus macro remove
 */
export function concreteQuery<R, E, A>(_: Query<R, E, A>): asserts _ is QueryInternal<R, E, A> {
  //
}
