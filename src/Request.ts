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

export abstract class DescribedRequest<E, A> extends Request<E, A> {
  abstract readonly description: string;

  [eqSymbol](that: this): boolean {
    if (this.description !== that.description) {
      return false;
    }
    let eq = true;
    for (const k of Object.keys(this)) {
      const x = this[k];
      const y = that[k];
      if (isEquatable(x)) {
        if (!x[eqSymbol](y)) {
          eq = false;
          break;
        }
      } else {
        if (x !== y) {
          eq = false;
          break;
        }
      }
    }
    return eq;
  }

  [hashSymbol](): number {
    return H.string(this.description);
  }
}
