import { cachingEnabled } from "@effect/query/Query/operations/_internal/cachingEnabled"

/**
 * Disables caching for this query.
 *
 * @tsplus getter effect/query/Query uncached
 */
export function uncached<R, E, A>(self: Query<R, E, A>): Query<R, E, A> {
  return Do(($) => {
    const enabled = $(Query.fromEffect(cachingEnabled.getAndSet(false)))
    return $(self.ensuring(Query.fromEffect(cachingEnabled.set(enabled))))
  })
}
