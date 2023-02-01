import type * as Described from "@effect/query/Described"

/** @internal */
const DescribedSymbolKey = "@effect/query/Described"

/** @internal */
export const DescribedTypeId: Described.DescribedTypeId = Symbol.for(
  DescribedSymbolKey
) as Described.DescribedTypeId

class DescribedImpl<A> implements Described.Described<A> {
  readonly [DescribedTypeId]: Described.DescribedTypeId = DescribedTypeId
  constructor(readonly value: A, readonly description: string) {}
}

/** @internal */
export const make = <A>(value: A, description: string): Described.Described<A> => new DescribedImpl(value, description)
