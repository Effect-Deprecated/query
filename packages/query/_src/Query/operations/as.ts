/**
 * Maps the success value of this query to the specified constant value.
 *
 * @tsplus static effect/query/Query.Aspects as
 * @tsplus pipeable effect/query/Query as
 */
export function as<B>(value: B) {
  return <R, E, A>(self: Query<R, E, A>): Query<R, E, B> => self.map(() => value)
}
