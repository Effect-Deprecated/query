/**
 * Provides this query with its required environment.
 *
 * @tsplus static effect/query/Query.Aspects provideEnvironment
 * @tsplus pipeable effect/query/Query provideEnvironment
 */
export function provideEnvironment<R>(env: Described<Env<R>>) {
  return <E, A>(self: Query<R, E, A>): Query<never, E, A> =>
    Query.succeed(env).flatMap((env) =>
      self.provideSomeEnvironment(Described(() => env.value, `() => ${env.description}`))
    )
}
