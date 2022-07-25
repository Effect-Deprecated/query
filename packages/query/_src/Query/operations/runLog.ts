/**
 * Returns an effect that models executing this query, returning the query
 * result along with the cache.
 *
 * @tsplus getter effect/query/Query runLog
 */
export function runLog<R, E, A>(self: Query<R, E, A>): Effect<R, E, Tuple<[Cache, A]>> {
  return Cache.empty.flatMap((cache) => self.runCache(cache).map((a) => Tuple(cache, a)))
}
