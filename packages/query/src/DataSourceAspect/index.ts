import type { DataSource } from "../DataSource"

/**
 * A `DataSourceAspect` is an aspect that can be weaved into queries. You can
 * think of an aspect as a polymorphic function, capable of transforming one
 * data source into another, possibly enlarging the environment type.
 */
export interface DataSourceAspect<R> {
  <R1, A>(dataSource: DataSource<R1, A>): DataSource<R1 & R, A>
}

/**
 * Returns a new aspect that represents the sequential composition of this
 * aspect with the specified one.
 */
export function andThen<R2>(
  fb: DataSourceAspect<R2>
): <R1>(fa: DataSourceAspect<R1>) => DataSourceAspect<R1 & R2> {
  return (fa) => (dataSource) => fb(fa(dataSource))
}
