import { BlockedRequests, Par, Seq } from "@effect/query/_internal/BlockedRequests/definition"

/**
 * Transforms all data sources with the specified data source aspect, which
 * can change the environment type of data sources but must preserve the
 * request type of each data source.
 *
 * @tsplus static effect/query/BlockedRequests.Aspects mapDataSources
 * @tsplus pipeable effect/query/BlockedRequests mapDataSources
 */
export function mapDataSources<R, A, R2>(
  f: (dataSource: DataSource<R, A>) => DataSource<R2, A>
) {
  return (self: BlockedRequests<R>): BlockedRequests<R | R2> => {
    switch (self._tag) {
      case "Empty": {
        return self
      }
      case "Par": {
        return new Par(self.left.mapDataSources(f), self.right.mapDataSources(f))
      }
      case "Seq": {
        return new Seq(self.left.mapDataSources(f), self.right.mapDataSources(f))
      }
      case "Single": {
        return BlockedRequests.single(f(self.dataSource as DataSource<R, A>), self.blockedRequest)
      }
    }
  }
}
