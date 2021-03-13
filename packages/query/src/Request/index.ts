import "@effect-ts/system/Operator"

import * as H from "@effect-ts/core/Hash"
import type { M } from "@effect-ts/morphic"
import { equal } from "@effect-ts/morphic/Equal"
import { guard } from "@effect-ts/morphic/Guard"
import type { Equal } from "@effect-ts/system/Equal"
import type { Refinement } from "@effect-ts/system/Function"
import { circularDeepEqual } from "fast-equals"

import * as J from "../Internal/Json"

export const eqSymbol = Symbol()
export const hashSymbol = Symbol()

export abstract class Request<E, A> {
  readonly _E!: () => E
  readonly _A!: () => A

  abstract readonly _tag: string
  abstract [eqSymbol](that: Request<unknown, unknown>): boolean
  abstract [hashSymbol](): number
}

export abstract class StandardRequest<E, A> extends Request<E, A> {
  #hash: number | undefined;

  [eqSymbol](that: Request<unknown, unknown>): boolean {
    return (
      this === that || (this._tag === that["_tag"] && circularDeepEqual(this, that))
    )
  }

  [hashSymbol](): number {
    if (this.#hash) {
      return this.#hash
    }
    this.#hash = H.string(J.stringify(this))
    return this.#hash
  }
}

export class MorphicRequest<K extends string, EI, AI, EE, AE, EO, AO> extends Request<
  AE,
  AO
> {
  #hash: number | undefined

  constructor(
    readonly _tag: K,
    readonly errorCodec: M<{}, EE, AE>,
    readonly payloadCodec: M<{}, EI, AI>,
    readonly responseCodec: M<{}, EO, AO>,
    readonly payload: AI,
    readonly eq: Equal<AI>,
    readonly guard: Refinement<unknown, AI>
  ) {
    super()
  }

  [eqSymbol](that: Request<unknown, unknown>): boolean {
    return (
      this === that ||
      (this._tag === that._tag &&
        that instanceof MorphicRequest &&
        this.guard(that.payload) &&
        this.eq.equals(this.payload, that.payload))
    )
  }
  [hashSymbol](): number {
    if (this.#hash) {
      return this.#hash
    }
    this.#hash = H.string(J.stringify({ _tag: this._tag, payload: this.payload }))
    return this.#hash
  }
}

export function morphicRequest<K extends string, EI, AI, EE, AE, EO, AO>(
  tag: K,
  input: M<{}, EI, AI>,
  error: M<{}, EE, AE>,
  output: M<{}, EO, AO>
) {
  const eq = equal(input)
  const is = guard(input)
  return (payload: AI) =>
    new MorphicRequest(tag, error, input, output, payload, eq, is.is)
}

export function morphicOpaqueRequest<
  A extends MorphicRequest<any, any, any, any, any, any, any>
>() {
  return <I>(f: (i: I) => A): ((i: I) => A) => f
}
