import { DurationInternal } from "@tsplus/stdlib/data/Duration"

/**
 * Returns a new query that executes this one and times the execution.
 *
 * @tsplus getter effect/query/Query timed
 */
export function timed<R, E, A>(self: Query<R, E, A>): Query<R, E, Tuple<[Duration, A]>> {
  return self.summarized(Clock.currentTime, (start, end) => new DurationInternal(end - start))
}
