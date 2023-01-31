/**
 * @since 1.0.0
 */
import * as internal from "@effect/query/internal/described"

/**
 * @since 1.0.0
 * @category symbols
 */
export const DescribedTypeId: unique symbol = internal.DescribedTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type DescribedTypeId = typeof DescribedTypeId

/**
 * A `Described<A>` is a value of type `A` along with a string description of
 * that value. The description may be used to generate a hash associated with
 * the value, so values that are equal should have the same description and
 * values that are not equal should have different descriptions.
 *
 * @since 1.0.0
 * @category models
 */
export interface Described<A> extends Described.Proto {
  readonly value: A
  readonly description: string
}

/**
 * @since 1.0.0
 */
export declare namespace Described {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [DescribedTypeId]: DescribedTypeId
  }
}

/**
 * Constructs a new `Described<A>` from a value and a description.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: <A>(value: A, description: string) => Described<A> = internal.make
