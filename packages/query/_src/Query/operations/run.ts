/**
 * Returns an effect that models executing this query.
 *
  @tsplus getter effect/query/Query run
 */
export function run<R, E, A>(self: Query<R, E, A>): Effect<R, E, A> {
  return self.runLog.map((tuple) => tuple.get(1))
}
