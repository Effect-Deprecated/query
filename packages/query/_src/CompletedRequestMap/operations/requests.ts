/**
 * Collects all requests in a set.
 *
 * @tsplus getter effect/query/CompletedRequestMap requests
 */
export function requests(self: CompletedRequestMap): HashSet<Request<unknown, unknown>> {
  return self.map.keySet
}
