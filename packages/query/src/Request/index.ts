// tracing: on

import "@effect-ts/system/Operator"

import { Case, equalsSym, hashSym } from "@effect-ts/system/Case"

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

export function hashRequest(x: Request<any, any>): number {
  return x[hashSym]()
}

export function eqRequest(x: Request<any, any>, y: Request<any, any>): boolean {
  return x === y || (x._tag === y._tag && x[equalsSym](y))
}
