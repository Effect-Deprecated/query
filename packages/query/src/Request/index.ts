import "@effect-ts/system/Operator"

import * as H from "@effect-ts/core/Hash"
import type { M } from "@effect-ts/morphic"
import { equal } from "@effect-ts/morphic/Equal"
import type { Equal } from "@effect-ts/system/Equal"
import { circularDeepEqual } from "fast-equals"
import J from "fast-safe-stringify"

export const eqSymbol = Symbol()
export const hashSymbol = Symbol()

export interface Equatable {
  [eqSymbol](that: this): boolean
}

export function isEquatable(u: unknown): u is Equatable {
  return typeof u === "object" && u != null && eqSymbol in u
}

export interface Hashable {
  [hashSymbol](): number
}

export abstract class Request<E, A> implements Equatable {
  readonly _E!: () => E
  readonly _A!: () => A

  abstract readonly _tag: string
  abstract [eqSymbol](that: this): boolean
  abstract [hashSymbol](): number
}

export abstract class StandardRequest<E, A> extends Request<E, A> {
  #hash: number | undefined;

  [eqSymbol](that: this): boolean {
    return circularDeepEqual(this, that)
  }

  [hashSymbol](): number {
    if (this.#hash) {
      return this.#hash
    }
    this.#hash = H.string(J.stableStringify(this))
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
    readonly eq: Equal<AI>
  ) {
    super()
  }

  [eqSymbol](that: this): boolean {
    return this.eq.equals(this.payload, that.payload)
  }
  [hashSymbol](): number {
    if (this.#hash) {
      return this.#hash
    }
    this.#hash = H.string(J.stableStringify(this.payload))
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
  return (payload: AI) => new MorphicRequest(tag, error, input, output, payload, eq)
}

export function morphicOpaqueRequest<
  A extends MorphicRequest<any, any, any, any, any, any, any>
>() {
  return <I>(f: (i: I) => A): ((i: I) => A) => f
}
