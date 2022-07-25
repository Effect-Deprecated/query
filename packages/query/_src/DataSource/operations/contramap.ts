/**
 * Returns a new data source that executes requests of type `B` using the
 * specified function to transform `B` requests into requests that this data
 * source can execute.
 *
 * @tsplus static effect/query/DataSource.Aspects contramap
 * @tsplus pipeable effect/query/DataSource contramap
 */
export function contramap<B, A>(f: Described<(b: B) => A>) {
  return <R>(self: DataSource<R, A>): DataSource<R, B> =>
    DataSource.make(
      `${self.identifier}.contramap(${f.description})`,
      (requests) => self.runAll(requests.map((chunk) => chunk.map(f.value)))
    )
}
