/**
 * @tsplus static effect/query/Query.Ops absolve
 */
export function absolve<R, E, A>(query: Query<R, E, Either<E, A>>): Query<R, E, A> {
  return query.flatMap((either) => Query.fromEither(either))
}
