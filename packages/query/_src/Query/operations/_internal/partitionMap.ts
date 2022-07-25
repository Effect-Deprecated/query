/**
 * Partitions the elements of a collection using the specified function.
 */
export function partitionMap<A, B, C>(
  as: Collection<A>,
  f: (a: A) => Either<B, C>
): Tuple<[Chunk<B>, Chunk<C>]> {
  const bs = Chunk.builder<B>()
  const cs = Chunk.builder<C>()
  Array.from(as).forEach((a) => {
    const result = f(a)
    switch (result._tag) {
      case "Left": {
        bs.append(result.left)
        break
      }
      case "Right": {
        cs.append(result.right)
        break
      }
    }
  })
  return Tuple(bs.build(), cs.build())
}
