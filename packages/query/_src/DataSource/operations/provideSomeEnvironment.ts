/**
 * Provides this data source with part of its required environment.
 *
 * @tsplus static effect/query/DataSource.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/query/DataSource provideSomeEnvironment
 */
export function provideSomeEnvironment<R0, R>(f: Described<(env: Env<R0>) => Env<R>>) {
  return <A>(self: DataSource<R, A>): DataSource<R0, A> =>
    DataSource.make(
      `${self.identifier}.provideSomeEnvironment(${f.description})`,
      (requests) => self.runAll(requests).provideSomeEnvironment(f.value)
    )
}
