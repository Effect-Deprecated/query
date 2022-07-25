/**
 * Retrieves the result of the specified request if it exists.
 *
 * @tsplus static effect/query/CompletedRequestMap.Aspects lookup
 * @tsplus pipeable effect/query/CompletedRequestMap lookup
 */
export function lookup<E, A>(request: Request<E, A>) {
  return (self: CompletedRequestMap): Maybe<Either<E, A>> =>
    self.map.get(request) as Maybe<Either<E, A>>
}
