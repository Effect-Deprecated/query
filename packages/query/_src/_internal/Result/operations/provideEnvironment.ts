import type { Result } from "@effect/query/_internal/Result/definition"

/**
 * Provides this result with its required environment.
 *
 * @tsplus static effect/query/Result.Aspects provideEnvironment
 * @tsplus pipeable effect/query/Result provideEnvironment
 */
export function provideEnvironment<R>(r: Described<Env<R>>) {
  return <E, A>(self: Result<R, E, A>): Result<never, E, A> => {
    return self.provideSomeEnvironment(Described(() => r.value, `() => ${r.description}`))
  }
}
