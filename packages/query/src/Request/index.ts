import "@effect-ts/system/Operator"

import type { equalsSym, hashSym } from "@effect-ts/system/Case"
import { Case } from "@effect-ts/system/Case"

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
