/**
 * @tsplus static effect/query/DataSource.Aspects equals
 * @tsplus pipeable effect/query/DataSource equals
 */
export function equals<R, A>(that: DataSource<R, A>) {
  return (self: DataSource<R, A>): boolean => self == that
}
