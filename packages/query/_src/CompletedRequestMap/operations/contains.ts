/**
 * Returns whether a result exists for the specified request.
 *
 * @tsplus static effect/query/CompletedRequestMap.Aspects contains
 * @tsplus pipeable effect/query/CompletedRequestMap contains
 */
export function contains(request: unknown) {
  return (self: CompletedRequestMap): boolean => self.map.has(request)
}
