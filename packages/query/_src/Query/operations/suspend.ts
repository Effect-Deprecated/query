/**
 * Returns a lazily constructed query.
 *
 * @tsplus static effect/query/Query.Ops suspend
 */
export function suspend<R, E, A>(query: LazyArg<Query<R, E, A>>): Query<R, E, A> {
  return Query.unit.flatMap(query)
}
