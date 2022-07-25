/**
 * A data source aspect that executes requests between two effects, `before`
 * and `after`, where the result of `before` can be used by `after`.
 *
 * @tsplus static effect/query/Query.Ops around
 * @tsplus static effect/query/Query.Aspects around
 * @tsplus pipeable effect/query/Query around
 */
export function around<R2, A2, R3, A3>(
  before: Described<Effect<R2, never, A2>>,
  after: Described<(a: A2) => Effect<R3, never, A3>>
) {
  return <R, E, A>(self: Query<R, E, A>): Query<R | R2 | R3, E, A> =>
    self.mapDataSources((dataSource) => {
      const aroundIdentifier = `Query.around(${before.description}, ${after.description})`
      const identifier = `${dataSource.identifier}.apply(${aroundIdentifier})`
      return DataSource.make(
        identifier,
        (requests) =>
          Effect.acquireUseRelease(
            before.value,
            () => dataSource.runAll(requests),
            after.value
          )
      )
    })
}
