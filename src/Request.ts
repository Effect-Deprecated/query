const RequestSymbol = Symbol();

export abstract class Request<E, A> {
  readonly [RequestSymbol]: "Request";
  abstract readonly _tag: string;
  readonly _E!: () => E;
  readonly _A!: () => A;

  abstract readonly equals: (that: this) => boolean;
}
