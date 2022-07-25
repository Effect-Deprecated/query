import { Continue } from "@effect/query/_internal/Continue/definition"
import { Result } from "@effect/query/_internal/Result/definition"
import {
  concreteQuery,
  QueryInternal
} from "@effect/query/Query/operations/_internal/QueryInternal"
/**
 * Transforms all data sources with the specified data source aspect.
 *
 * @tsplus static effect/query/Continue.Aspects mapDataSources
 * @tsplus pipeable effect/query/Continue mapDataSources
 */
export function mapDataSources<R, A, R2>(f: (dataSource: DataSource<R, A>) => DataSource<R2, A>) {
  return <E>(self: Continue<R, E, A>): Continue<R | R2, E, A> => {
    switch (self._tag) {
      case "Eff": {
        return Continue.effect(mapDataSourcesQuery(self.query, f))
      }
      case "Get": {
        return self
      }
    }
  }
}

export function mapDataSourcesResult<R, E, A, R2>(
  self: Result<R, E, A>,
  f: (dataSource: DataSource<R, A>) => DataSource<R2, A>
): Result<R | R2, E, A> {
  switch (self._tag) {
    case "Blocked": {
      return Result.blocked(self.blockedRequests.mapDataSources(f), self.cont.mapDataSources(f))
    }
    case "Done": {
      return self
    }
    case "Fail": {
      return self
    }
  }
}

export function mapDataSourcesQuery<R, E, A, R2>(
  self: Query<R, E, A>,
  f: (dataSource: DataSource<R, A>) => DataSource<R2, A>
): Query<R | R2, E, A> {
  concreteQuery(self)
  return new QueryInternal<R | R2, E, A>(self.step.map((result) => mapDataSourcesResult(result, f)))
}
