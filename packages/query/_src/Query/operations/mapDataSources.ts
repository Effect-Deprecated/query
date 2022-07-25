import { mapDataSourcesQuery } from "@effect/query/_internal/Continue/operations/mapDataSources"

/**
 * Transforms all data sources with the specified data source aspect.
 *
 * @tsplus static effect/query/Query.Aspects mapDataSources
 * @tsplus pipeable effect/query/Query mapDataSources
 */
export function mapDataSources<R, A, R2>(
  f: (dataSource: DataSource<R, A>) => DataSource<R2, A>
) {
  return <E>(self: Query<R, E, A>): Query<R | R2, E, A> => mapDataSourcesQuery(self, f)
}
