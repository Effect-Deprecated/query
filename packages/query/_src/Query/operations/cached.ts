import { cachingEnabled } from "@effect/query/Query/operations/_internal/cachingEnabled"
import { constTrue } from "@tsplus/stdlib/data/Function"

/**
 * Enables caching for this query.
 *
 * @tsplus getter effect/query/Query cached
 */
export function cached<R, E, A>(self: Query<R, E, A>): Query<R, E, A> {
  return Do(($) => {
    const enabled = $(Query.fromEffect(cachingEnabled.getAndUpdate(constTrue)))
    return $(self.ensuring(Query.fromEffect(cachingEnabled.set(enabled))))
  })
}
