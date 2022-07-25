import type { BlockedRequests } from "@effect/query/_internal/BlockedRequests/definition"
import { currentCache } from "@effect/query/Query/operations/_internal/currentCache"

/**
 * Executes all requests, submitting requests to each data source in
 * parallel.
 *
 * @tsplus static effect/query/BlockedRequests.Ops run
 * @tsplus getter effect/query/BlockedRequests run
 */
export function run<R>(self: BlockedRequests<R>): Effect<R, never, void> {
  return currentCache.get().flatMap((cache) =>
    Effect.forEachDiscard(
      self.flatten,
      (requestsByDataSource) =>
        Effect.forEachParDiscard(requestsByDataSource, ({ tuple: [dataSource, sequential] }) =>
          Do(($) => {
            const completedRequests = $(
              dataSource.runAll(sequential.map((chunk) =>
                chunk.map((_) => _.request)
              ))
            )
            const blockedRequests = sequential.flatten
            const leftovers = completedRequests.requests
              .difference(blockedRequests.map((_) => _.request))

            $(Effect.forEachDiscard(blockedRequests, (blockedRequest) =>
              blockedRequest.result.set(completedRequests.lookup(blockedRequest.request))))

            $(Effect.forEachDiscard(leftovers, (request) =>
              Ref.make(completedRequests.lookup(request)).flatMap((ref) =>
                cache.put(request, ref)
              )))
          }).unit())
    )
  )
}
