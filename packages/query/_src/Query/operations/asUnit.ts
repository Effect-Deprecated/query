import { constVoid } from "@tsplus/stdlib/data/Function"

/**
 * Maps the success value of this query to `undefined`.
 *
 * @tsplus getter effect/query/Query unit
 */
export function asUnit<R, E, A>(self: Query<R, E, A>): Query<R, E, void> {
  return self.map(constVoid)
}
