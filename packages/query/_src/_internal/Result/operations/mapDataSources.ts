import { mapDataSourcesResult } from "@effect/query/_internal/Continue/operations/mapDataSources"
import type { Result } from "@effect/query/_internal/Result/definition"

/**
 * Transforms all data sources with the specified data source aspect.
 *
 * @tsplus static effect/query/Result.Aspects mapDataSources
 * @tsplus pipeable effect/query/Result mapDataSources
 */
export function mapDataSources<R, A, R2>(
  f: (dataSource: DataSource<R, A>) => DataSource<R2, A>
) {
  return <E>(self: Result<R, E, A>): Result<R | R2, E, A> => mapDataSourcesResult(self, f)
}
