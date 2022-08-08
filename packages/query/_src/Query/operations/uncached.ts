import { cachingEnabled } from "@effect/query/Query/operations/_internal/cachingEnabled"
import { constFalse } from "@tsplus/stdlib/data/Function"

/**
 * Disables caching for this query.
 *
 * @tsplus getter effect/query/Query uncached
 */
export function uncached<R, E, A>(self: Query<R, E, A>): Query<R, E, A> {
  return Do(($) => {
    const enabled = $(Query.fromEffect(cachingEnabled.getAndUpdate(constFalse)))
    return $(self.ensuring(Query.fromEffect(cachingEnabled.set(enabled))))
  })
}
