import { provideSomeEnvironmentQuery } from "@effect/query/_internal/Continue/operations/provideSomeEnvironment"

/**
 * Provides this query with part of its required environment.
 *
 * @tsplus static effect/query/Query.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/query/Query provideSomeEnvironment
 */
export function provideSomeEnvironment<R0, R>(f: Described<(env: Env<R0>) => Env<R>>) {
  return <E, A>(self: Query<R, E, A>): Query<R0, E, A> => provideSomeEnvironmentQuery(self, f)
}
