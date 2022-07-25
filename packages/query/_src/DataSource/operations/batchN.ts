/**
 * Returns a data source that executes at most `n` requests in parallel.
 *
 * @tsplus static effect/query/DataSource.Aspects batchN
 * @tsplus pipeable effect/query/DataSource batchN
 */
export function batchN(n: number) {
  return <R, A>(self: DataSource<R, A>): DataSource<R, A> =>
    DataSource.make(
      `${self.identifier}.batchN(${n})`,
      (requests) =>
        n < 1 ?
          Effect.die(new IllegalArgumentException(`batchN: n must be at least 1`)) :
          self.runAll(
            requests.reduce(Chunk.empty<Chunk<A>>(), (acc, curr) => acc.concat(curr.grouped(n)))
          )
    )
}
