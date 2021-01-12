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

export abstract class IdentifiedRequest<E, A> extends Request<E, A> {
  /**
   * String representation of a unique request identifier that
   * should be build using request specific parameters.
   *
   * It will be used to compare requests to identify duplicates.
   */
  abstract readonly identifier: string;

  [eqSymbol](that: this): boolean {
    return this.identifier === that.identifier;
  }

  [hashSymbol](): number {
    return H.string(this.identifier);
  }
}
