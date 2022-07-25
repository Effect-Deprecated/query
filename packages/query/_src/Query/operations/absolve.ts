/**
 * @tsplus static effect/query/Query.Ops absolve
 */
export function absolve<R, E, A>(query: LazyArg<Query<R, E, Either<E, A>>>): Query<R, E, A> {
  return Query.suspend(query).flatMap((either) => Query.fromEither(either))
}
