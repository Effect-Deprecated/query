/**
 * A data source that never executes requests.
 *
 * @tsplus static effect/query/DataSource.Ops never
 */
export const never: DataSource<never, unknown> = DataSource.make("never", () => Effect.never)
