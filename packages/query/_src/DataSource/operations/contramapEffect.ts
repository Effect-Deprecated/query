/**
 * Returns a new data source that executes requests of type `B` using the
 * specified effectual function to transform `B` requests into requests that
 * this data source can execute.
 *
 * @tsplus static effect/query/DataSource.Aspects contramapEffect
 * @tsplus pipeable effect/query/DataSource contramapEffect
 */
export function contramapEffect<B, R2, A>(f: Described<(b: B) => Effect<R2, never, A>>) {
  return <R>(self: DataSource<R, A>): DataSource<R | R2, B> =>
    DataSource.make(
      `${self.identifier}.contramapEffect(${f.description})`,
      (requests) =>
        Effect.forEach(requests, (chunk) => Effect.forEachPar(chunk, f.value)).flatMap(self.runAll)
    )
}
