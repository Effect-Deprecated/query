import type { _A, _E, Request } from "@effect/query/Request"

export const BlockedRequestSym = Symbol.for("@effect/query/BlockedRequest")
export type BlockedRequestSym = typeof BlockedRequestSym

/**
 * A `BlockedRequest<A>` keeps track of a request of type `A` along with a
 * `Ref` containing the result of the request, existentially hiding the result
 * type. This is used internally by the library to support data sources that
 * return different result types for different requests while guaranteeing that
 * results will be of the type requested.
 *
 * @tsplus type effect/query/BlockedRequest
 */
export interface BlockedRequest<A> {
  readonly [BlockedRequestSym]: BlockedRequestSym
  readonly request: Request<
    [A] extends [{ [_E]: () => infer E }] ? E : never,
    [A] extends [{ [_A]: () => infer A }] ? A : never
  >
  readonly result: Ref<
    Maybe<
      Either<
        [A] extends [{ [_E]: () => infer E }] ? E : never,
        [A] extends [{ [_A]: () => infer A }] ? A : never
      >
    >
  >
}

/**
 * @tsplus type effect/query/BlockedRequest.Ops
 */
export interface BlockedRequestOps {}
export const BlockedRequest: BlockedRequestOps = {}

/**
 * @tsplus static effect/query/BlockedRequest.Ops __call
 * @tsplus static effect/query/BlockedRequest.Ops make
 */
export function make<A extends Request<any, any>>(
  request: A,
  result: Ref<Maybe<Either<Request.GetE<A>, Request.GetA<A>>>>
): BlockedRequest<A> {
  return {
    [BlockedRequestSym]: BlockedRequestSym,
    request,
    result
  }
}

/**
 * @tsplus static effect/query/BlockedRequest.Ops is
 */
export function isBlockedRequest(u: unknown): u is BlockedRequest<unknown> {
  return typeof u === "object" && u != null && BlockedRequestSym in u
}
