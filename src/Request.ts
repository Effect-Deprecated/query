import { circularDeepEqual } from "fast-equals";
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
  [eqSymbol](that: this): boolean {
    return circularDeepEqual(this, that);
  }

  [hashSymbol](): number {
    let h = H.string(this._tag);
    for (const k in Object.keys(this)) {
      if (k !== "_tag") {
        if (typeof this[k] === "string") {
          h = combineHash(h, H.string(this[k]));
        }
        if (typeof this[k] === "number") {
          h = combineHash(h, this[k]);
        }
      }
    }
    return h;
  }
}

function combineHash(a: number, b: number): number {
  return (a * 53) ^ b;
}
