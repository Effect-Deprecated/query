// tracing: off

import "@effect-ts/system/Operator"

import * as Case from "@effect-ts/core/Case"
import { _A, _E } from "@effect-ts/core/Effect"

export interface Request<E, A> {
  readonly [_E]: () => E
  readonly [_A]: () => A
}

export abstract class StandardRequest<
    X,
    E,
    A,
    D extends PropertyKey = "_tag" | "_typeId"
  >
  extends Case.Case<X, typeof _E | typeof _A | D>
  implements Request<E, A> {
  readonly [_E]!: () => E;
  readonly [_A]!: () => A
}
