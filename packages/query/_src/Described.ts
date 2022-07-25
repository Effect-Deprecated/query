/**
 * A `Described<A>` is a value of type `A` along with a string description of
 * that value. The description may be used to generate a hash associated with
 * the value, so values that are equal should have the same description and
 * values that are not equal should have different descriptions.
 *
 * @tsplus type effect/query/Described
 */
export interface Described<A> {
  readonly value: A
  readonly description: string
}

/**
 * @tsplus type effect/query/Described.Ops
 */
export interface DescribedOps {}
export const Described: DescribedOps = {}

/**
 * @tsplus static effect/query/Described.Ops __call
 * @tsplus static effect/query/Described.Ops describe
 */
export function describe<A>(value: A, description: string): Described<A> {
  return { value, description }
}
