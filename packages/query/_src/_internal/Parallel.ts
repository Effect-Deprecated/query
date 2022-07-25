import type { BlockedRequest } from "@effect/query/_internal/BlockedRequest"
import { Sequential } from "@effect/query/_internal/Sequential"
import type { HashMapInternal } from "@tsplus/stdlib/collections/HashMap/_internal/hashMap"
import { HashMapIterator, realHashMap } from "@tsplus/stdlib/collections/HashMap/_internal/hashMap"
/**
 * A `Parallel[R]` maintains a mapping from data sources to requests from
 * those data sources that can be executed in parallel.
 *
 * @tsplus type effect/query/Parallel
 * @tsplus companion effect/query/Parallel.Ops
 */
export class Parallel<R> implements
  Collection<
    Tuple<[
      DataSource<unknown, unknown>,
      Chunk<BlockedRequest<unknown>>
    ]>
  >
{
  constructor(
    readonly map: HashMap<
      DataSource<unknown, unknown>,
      Chunk<BlockedRequest<unknown>>
    >
  ) {}

  /**
   * Returns whether this collection of requests is empty.
   */
  get isEmpty(): boolean {
    return this.map.isEmpty
  }

  /**
   * Returns a collection of the data sources that the requests in this
   * collection are from.
   */
  get keys(): Collection<DataSource<R, unknown>> {
    return Array.from(this.map.keys) as Collection<DataSource<R, unknown>>
  }

  /**
   * Converts this collection of requests that can be executed in parallel to
   * a batch of requests in a collection of requests that must be executed
   * sequentially.
   */
  get sequential(): Sequential<R> {
    return new Sequential(
      this.map.reduceWithIndex(
        HashMap.empty(),
        (map, k, v) => map.set(k, Chunk.single(v))
      )
    )
  }

  /**
   * Combines this collection of requests that can be executed in parallel
   * with that collection of requests that can be executed in parallel to
   * return a new collection of requests that can be executed in parallel.
   */
  combinePar<R1>(that: Parallel<R1>): Parallel<R & R1> {
    return new Parallel(
      this.map.reduceWithIndex(
        that.map,
        (map, key, value) => map.set(key, map.get(key).fold(value, (chunk) => chunk.concat(value)))
      )
    )
  }

  [Symbol.iterator](): Iterator<
    Tuple<[DataSource<unknown, unknown>, Chunk<BlockedRequest<unknown>>]>
  > {
    realHashMap(this.map)
    return new HashMapIterator(
      this.map as HashMapInternal<DataSource<unknown, unknown>, Chunk<BlockedRequest<unknown>>>,
      identity
    )
  }
}

/**
 * Constructs a new collection of requests containing a mapping from the
 * specified data source to the specified request.
 *
 * @tsplus static effect/query/Parallel.Ops __call
 * @tsplus static effect/query/Parallel.Ops make
 */
export function make<R, A>(
  dataSource: DataSource<R, A>,
  blockedRequest: BlockedRequest<A>
): Parallel<R> {
  return new Parallel(
    HashMap.empty<DataSource<unknown, unknown>, Chunk<BlockedRequest<A>>>().set(
      dataSource as DataSource<unknown, unknown>,
      Chunk.single(blockedRequest)
    )
  )
}

/**
 * The empty collection of requests.
 *
 * @tsplus static effect/query/Parallel.Ops empty
 */
export function empty<A = unknown>(): Parallel<A> {
  return new Parallel(HashMap.empty())
}
