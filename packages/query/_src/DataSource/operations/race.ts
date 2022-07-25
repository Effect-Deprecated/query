/**
 * Returns a new data source that executes requests by sending them to this
 * data source and that data source, returning the results from the first
 * data source to complete and safely interrupting the loser.
 *
 * @tsplus static effect/query/DataSource.Aspects race
 * @tsplus pipeable effect/query/DataSource race
 */
export function race<R2, A2>(that: DataSource<R2, A2>) {
  return <R, A>(self: DataSource<R, A>): DataSource<R | R2, A & A2> =>
    DataSource.make(
      `${self.identifier}.race(${that.identifier})`,
      (requests) => self.runAll(requests).race(that.runAll(requests))
    )
}
