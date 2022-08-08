import { currentCache } from "@effect/query/Query/operations/_internal/currentCache"
import { concreteQuery } from "@effect/query/Query/operations/_internal/QueryInternal"

/**
 * Returns an effect that models executing this query with the specified
 * cache.
 *
 * @tsplus static effect/query/Query.Aspects runCache
 * @tsplus pipeable effect/query/Query runCache
 */
export function runCache(cache: Cache) {
  return <R, E, A>(self: Query<R, E, A>): Effect<R, E, A> => {
    return runCacheInternal(self).apply(currentCache.locally(cache))
  }
}

export function runCacheInternal<R, E, A>(self: Query<R, E, A>): Effect<R, E, A> {
  concreteQuery(self)
  return self.step.flatMap((result) => {
    switch (result._tag) {
      case "Blocked": {
        switch (result.cont._tag) {
          case "Eff": {
            return result.blockedRequests.run.zipRight(runCacheInternal(result.cont.query))
          }
          case "Get": {
            return result.blockedRequests.run.zipRight(result.cont.io)
          }
        }
      }
      case "Done": {
        return Effect.succeed(result.value)
      }
      case "Fail": {
        return Effect.failCause(result.cause)
      }
    }
  })
}
