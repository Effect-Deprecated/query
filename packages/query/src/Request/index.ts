// tracing: off

import "@effect-ts/system/Operator"

import { Case, equalsSym, hashSym } from "@effect-ts/core/Case"
import * as EQ from "@effect-ts/core/Equal"
import * as H from "@effect-ts/core/Hash"

export interface Request<E, A> {
  readonly _E: () => E
  readonly _A: () => A

  readonly _tag: string

  readonly [equalsSym]: (that: Request<unknown, unknown>) => boolean
  readonly [hashSym]: () => number
}

export abstract class StandardRequest<X, E, A>
  extends Case<X, "_tag" | "_E" | "_A">
  implements Request<E, A> {
  readonly _E!: () => E
  readonly _A!: () => A

  abstract readonly _tag: string
}

export const hashRequest = H.makeHash((x: Request<any, any>) => {
  return x[hashSym]()
})

export const eqRequest = EQ.makeEqual((x: Request<any, any>, y: Request<any, any>) => {
  return x === y || (x._tag === y._tag && x[equalsSym](y))
})
