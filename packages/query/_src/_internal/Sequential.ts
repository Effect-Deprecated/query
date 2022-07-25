import type { BlockedRequest } from "@effect/query/_internal/BlockedRequest"
import type { HashMapInternal } from "@tsplus/stdlib/collections/HashMap/_internal/hashMap"
import { HashMapIterator, realHashMap } from "@tsplus/stdlib/collections/HashMap/_internal/hashMap"

/**
 * A `Sequential<R>` maintains a mapping from data sources to batches of
 * requests from those data sources that must be executed sequentially.
 *
 * @tsplus type effect/query/Sequential
 */
export class Sequential<R>
  implements Collection<Tuple<[DataSource<R, unknown>, Chunk<Chunk<BlockedRequest<unknown>>>]>>
{
  constructor(
    readonly map: HashMap<
      DataSource<unknown, unknown>,
      Chunk<Chunk<BlockedRequest<unknown>>>
    >
  ) {}

  /**
   * Returns whether this collection of batches of requests is empty.
   */
  get isEmpty(): boolean {
    return this.map.isEmpty
  }

  /**
   * Returns a collection of the data sources that the batches of requests in
   * this collection are from.
   */
  get keys(): Collection<DataSource<R, unknown>> {
    return Array.from(this.map.keys) as Collection<DataSource<R, unknown>>
  }

  /**
   * Combines this collection of batches of requests that must be executed
   * sequentially with that collection of batches of requests that must be
   * executed sequentially to return a new collection of batches of requests
   * that must be executed sequentially.
   */
  combineSeq<R2>(that: Sequential<R2>): Sequential<R & R2> {
    return new Sequential(
      that.map.reduceWithIndex(this.map, (map, key, value) => {
        return map.set(
          key,
          map.get(key).fold(Chunk.empty(), (chunk) => chunk.concat(value))
        )
      })
    )
  }

  [Symbol.iterator](): Iterator<
    Tuple<[DataSource<R, unknown>, Chunk<Chunk<BlockedRequest<unknown>>>]>
  > {
    realHashMap(this.map)
    return new HashMapIterator(
      this.map as HashMapInternal<DataSource<R, unknown>, Chunk<Chunk<BlockedRequest<unknown>>>>,
      identity
    )
  }
}
