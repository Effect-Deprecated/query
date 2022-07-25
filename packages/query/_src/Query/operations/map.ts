import { _mapQuery } from "@effect/query/_internal/Continue/operations/map"

/**
 * Maps the specified function over the successful result of this query.
 *
 * @tsplus static effect/query/Query.Aspects map
 * @tsplus pipeable effect/query/Query map
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: Query<R, E, A>): Query<R, E, B> => _mapQuery(self, f)
}
