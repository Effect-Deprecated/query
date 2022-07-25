/**
 * A data source aspect that limits data sources to executing at most `n`
 * requests in parallel.
 *
 * @tsplus static effect/query/Query.Ops maxBatchSize
 * @tsplus static effect/query/Query.Aspects maxBatchSize
 * @tsplus pipeable effect/query/Query maxBatchSize
 */
export function maxBatchSize(n: number) {
  return <R, E, A>(self: Query<R, E, A>): Query<R, E, A> =>
    self.mapDataSources((dataSource) => dataSource.batchN(n))
}
