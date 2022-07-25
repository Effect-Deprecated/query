import type { ChunkBuilder } from "@tsplus/stdlib/collections/Chunk"

/**
 * Performs a query for each element in a collection, collecting the results
 * into a query returning a collection of their results. Requests will be
 * executed sequentially and will be pipelined.
 *
 * @tsplus static effect/query/Query.Ops forEach
 */
export function forEach<R, E, A, B>(
  as: Collection<A>,
  f: (a: A) => Query<R, E, B>
): Query<R, E, Chunk<B>> {
  const iterator = as[Symbol.iterator]()
  let builder: Query<R, E, ChunkBuilder<B>> | undefined = undefined
  let next: IteratorResult<A>
  while (!(next = iterator.next()).done) {
    if (builder == null) {
      builder = f(next.value).map((b) => Chunk.builder<B>().append(b))
    } else {
      builder = builder.zipWith(f(next.value), (a, b) => a.append(b))
    }
  }
  if (builder == null) {
    return Query.succeed(Chunk.empty<B>())
  }
  return builder.map((_) => _.build())
}
