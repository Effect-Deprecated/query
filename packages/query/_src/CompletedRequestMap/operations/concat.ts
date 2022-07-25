/**
 * Combines two `CompletedRequestMap`s.
 *
 * @tsplus pipeable-operator effect/query/CompletedRequestMap +
 * @tsplus static effect/query/CompletedRequestMap.Aspects concat
 * @tsplus pipeable effect/query/CompletedRequestMap concat
 */
export function concat(that: CompletedRequestMap) {
  return (self: CompletedRequestMap): CompletedRequestMap =>
    new CompletedRequestMap(self.map.union(that.map))
}
