/**
 * Appends the specified result to the completed requests map.
 *
 * @tsplus static effect/query/CompletedRequestMap.Aspects insert
 * @tsplus pipeable effect/query/CompletedRequestMap insert
 */
export function insert<E, A>(request: Request<E, A>, result: Either<E, A>) {
  return (self: CompletedRequestMap): CompletedRequestMap =>
    new CompletedRequestMap(self.map.set(request, result))
}
