/**
 * Returns a new data source that executes requests of type `C` using the
 * specified function to transform `C` requests into requests that either
 * this data source or that data source can execute.
 *
 * @tsplus static effect/query/DataSource.Aspects eitherWith
 * @tsplus pipeable effect/query/DataSource eitherWith
 */
export function eitherWith<R2, B, A, C>(
  that: DataSource<R2, B>,
  f: Described<(c: C) => Either<A, B>>
) {
  return <R>(self: DataSource<R, A>): DataSource<R | R2, C> =>
    DataSource.make(
      `${self.identifier}.eitherWith(${that.identifier}, ${f.description})`,
      (requests) =>
        Effect.forEach(requests, (requests) => {
          const { tuple: [as, bs] } = requests.partitionMap(f.value)
          return self.runAll(Chunk.single(as)).zipWithPar(that.runAll(Chunk(bs)), (a, b) =>
            a.concat(b))
        })
          .map((chunk) =>
            chunk.reduce(CompletedRequestMap.empty, (a, b) => a.concat(b))
          )
    )
}
