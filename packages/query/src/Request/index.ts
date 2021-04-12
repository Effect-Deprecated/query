// tracing: off

import "@effect-ts/system/Operator"

import * as Case from "@effect-ts/core/Case"
import * as EQ from "@effect-ts/core/Equal"
import * as H from "@effect-ts/core/Hash"
import * as St from "@effect-ts/core/Structural"

export interface Request<E, A> {
  readonly _E: () => E
  readonly _A: () => A
}

export abstract class StandardRequest<
    X,
    E,
    A,
    D extends PropertyKey = "_tag" | "_typeId"
  >
  extends Case.Case<X, "_E" | "_A" | D>
  implements Request<E, A> {
  readonly _E!: () => E
  readonly _A!: () => A
}

export const hashRequest = H.makeHash((x: Request<any, any>) => St.hash(x))

export const eqRequest = EQ.makeEqual((x: Request<any, any>, y: Request<any, any>) => {
  return x === y || St.equals(x, y)
})
