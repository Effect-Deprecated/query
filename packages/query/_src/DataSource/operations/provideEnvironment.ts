/**
 * Provides this data source with its required environment.
 *
 * @tsplus static effect/query/DataSource.Aspects provideEnvironment
 * @tsplus pipeable effect/query/DataSource provideEnvironment
 */
export function provideEnvironment<R>(r: Described<Env<R>>) {
  return <A>(self: DataSource<R, A>): DataSource<never, A> =>
    self.provideSomeEnvironment(
      Described(() => r.value, `() => ${r.description}`)
    )
}
