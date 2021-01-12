import { circularDeepEqual } from "fast-equals";
import J from "fast-safe-stringify";
import * as H from "@effect-ts/core/Common/Hash";

export const eqSymbol = Symbol();
export const hashSymbol = Symbol();

export interface Equatable {
  [eqSymbol](that: this): boolean;
}

export function isEquatable(u: unknown): u is Equatable {
  return typeof u === "object" && u != null && eqSymbol in u;
}

export interface Hashable {
  [hashSymbol](): number;
}

export abstract class Request<E, A> implements Equatable {
  readonly _E!: () => E;
  readonly _A!: () => A;

  abstract readonly _tag: string;
  abstract [eqSymbol](that: this): boolean;
  abstract [hashSymbol](): number;
}

export abstract class StandardRequest<E, A> extends Request<E, A> {
  #hash: number | undefined;

  [eqSymbol](that: this): boolean {
    return circularDeepEqual(this, that);
  }

  [hashSymbol](): number {
    if (this.#hash) {
      return this.#hash;
    }
    this.#hash = H.string(J.stableStringify(this));
    return this.#hash;
  }
}
