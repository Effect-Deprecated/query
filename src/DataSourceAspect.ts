import { DataSource } from "./DataSource";
/**
 * A `DataSourceAspect` is an aspect that can be weaved into queries. You can
 * think of an aspect as a polymorphic function, capable of transforming one
 * data source into another, possibly enlarging the environment type.
 */
export interface DataSourceAspect<R> {
  <R1 extends R, A>(dataSource: DataSource<R1, A>): DataSource<R1, A>;
}

/**
 * Returns a new aspect that represents the sequential composition of this
 * aspect with the specified one.
 */
export function andThen<R, R1>(
  fb: DataSourceAspect<R & R1>
): (fa: DataSourceAspect<R>) => DataSourceAspect<R & R1> {
  return (fa) => (dataSource) => fb(fa(dataSource));
}
