/**
 * A `Described[A]` is a value of type `A` along with a string description of
 * that value. The description may be used to generate a hash associated with
 * the value, so values that are equal should have the same description and
 * values that are not equal should have different descriptions.
 */
export class Described<A> {
  readonly _tag = "Described"

  constructor(public readonly value: A, public readonly description: string) {}
}
