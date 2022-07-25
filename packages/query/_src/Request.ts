export const RequestSym = Symbol.for("@effect/query/Request")
export type RequestSym = typeof RequestSym

export const _A = Symbol.for("@effect/query/Request.A")
export type _A = typeof _A

export const _E = Symbol.for("@effect/query/Request.E")
export type _E = typeof _E

/**
 * A `Request<E, A>` is a request from a data source for a value of type `A`
 * that may fail with an `E`.
 *
 * @tsplus type effect/query/Request
 */
export interface Request<E, A> extends Case {
  readonly [RequestSym]: RequestSym
  readonly [_E]: () => E
  readonly [_A]: () => A
}

export declare namespace Request {
  export type GetE<R extends Request<any, any>> = [R] extends [{ [_E]: () => infer E }] ? E : never
  export type GetA<R extends Request<any, any>> = [R] extends [{ [_A]: () => infer A }] ? A : never

  export interface Constructor<C extends Case, E, A, T extends keyof C = never> {
    (args: Omit<C, T | keyof (Equals & Copy & Request<E, A>)>): Request<E, A> & C
  }
}

/**
 * @tsplus type effect/query/Request
 */
export interface RequestOps {
  readonly of: <R extends Request<any, any>>() => Request.Constructor<
    R,
    Request.GetE<R>,
    Request.GetA<R>
  >
  readonly tagged: <R extends Request<any, any> & { _tag: string }>(
    tag: R["_tag"]
  ) => Request.Constructor<R, Request.GetE<R>, Request.GetA<R>, "_tag">
}
export const Request: RequestOps = {
  of: () =>
    // @ts-expect-error
    Object.assign(Case.of(), {
      [RequestSym]: RequestSym
    }),
  tagged: (tag) =>
    // @ts-expect-error
    Object.assign(Case.tagged(tag), {
      [RequestSym]: RequestSym
    })
}

/**
 * @tsplus unify effect/query/Request
 */
export function unifyRequest<X extends Request<any, any>>(self: X): Request<
  [X] extends [{ [_E]: () => infer E }] ? E : never,
  [X] extends [{ [_A]: () => infer A }] ? A : never
> {
  return self
}
