import { BlockedRequests, Par, Seq } from "@effect/query/_internal/BlockedRequests/definition"

/**
 * Provides each data source with part of its required environment.
 *
 * @tsplus static effect/query/BlockedRequests.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/query/BlockedRequests provideSomeEnvironment
 */
export function provideSomeEnvironment<R0, R>(f: Described<(env: Env<R0>) => Env<R>>) {
  return (self: BlockedRequests<R>): BlockedRequests<R0> => {
    switch (self._tag) {
      case "Empty": {
        return self as unknown as BlockedRequests<R0>
      }
      case "Par": {
        return new Par(self.left.provideSomeEnvironment(f), self.right.provideSomeEnvironment(f))
      }
      case "Seq": {
        return new Seq(self.left.provideSomeEnvironment(f), self.right.provideSomeEnvironment(f))
      }
      case "Single": {
        return BlockedRequests.single(
          self.dataSource.provideSomeEnvironment(f),
          self.blockedRequest
        )
      }
    }
  }
}
