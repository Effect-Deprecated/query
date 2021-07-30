// ets_tracing: off

import "@effect-ts/system/Operator"

import * as Case from "@effect-ts/core/Case"
import { _A, _E } from "@effect-ts/core/Effect"
import * as St from "@effect-ts/core/Structural"
import { LazyGetter } from "@effect-ts/system/Utils"

export interface Request<E, A> {
  readonly [_E]: () => E
  readonly [_A]: () => A
}

// @ts-expect-error
export abstract class StandardRequest<X extends object, E, A>
  extends Case.Case<X>
  implements Request<E, A>
{
  readonly [_E]!: () => E;
  readonly [_A]!: () => A
}

const h0 = St.hashString("@effect-ts/system/Case")

// @ts-expect-error
export abstract class Static<X extends object, E, A>
  extends Case.Case<X>
  implements Request<E, A>
{
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

  @LazyGetter()
  get [St.hashSym](): number {
    let h = h0
    for (const k of this[Case.CaseBrand]) {
      h = St.combineHash(h, St.hash(this[k]))
    }
    return h
  }
}
