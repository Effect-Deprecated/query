import type * as Either from "@effect/data/Either"
import type * as Option from "@effect/data/Option"
import type * as Ref from "@effect/io/Ref"
import type * as Request from "@effect/query/Request"

/** @internal */
export const BlockedRequestTypeId = Symbol.for("@effect/query/BlockedRequest")

/** @internal */
export type BlockedRequestTypeId = typeof BlockedRequestTypeId

/**
 * A `BlockedRequest<A>` keeps track of a request of type `A` along with a
 * `Ref` containing the result of the request, existentially hiding the result
 * type. This is used internally by the library to support data sources that
 * return different result types for different requests while guaranteeing that
 * results will be of the type requested.
 *
 * @internal
 */
export interface BlockedRequest<R> extends BlockedRequest.Variance<R> {
  readonly request: Request.Request<
    [R] extends [Request.Request<infer _E, infer _A>] ? _E : never,
    [R] extends [Request.Request<infer _E, infer _A>] ? _A : never
  >
  readonly result: Ref.Ref<
    Option.Option<
      Either.Either<
        [R] extends [Request.Request<infer _E, infer _A>] ? _E : never,
        [R] extends [Request.Request<infer _E, infer _A>] ? _A : never
      >
    >
  >
}

/** @internal */
export declare namespace BlockedRequest {
  /** @internal */
  export interface Variance<R> {
    readonly [BlockedRequestTypeId]: {
      readonly _R: (_: never) => R
    }
  }
}

/** @internal */
class BlockedRequestImpl<A extends Request.Request<any, any>> implements BlockedRequest<A> {
  readonly [BlockedRequestTypeId] = blockedRequestVariance
  constructor(
    readonly request: A,
    readonly result: Ref.Ref<Option.Option<Either.Either<Request.Request.Error<A>, Request.Request.Success<A>>>>
  ) {}
}

/** @internal */
const blockedRequestVariance = {
  _R: (_: never) => _
}

/** @internal */
export const isBlockedRequest = (u: unknown): u is BlockedRequest<unknown> => {
  return typeof u === "object" && u != null && BlockedRequestTypeId in u
}

/** @internal */
export const make = <A extends Request.Request<any, any>>(
  request: A,
  result: Ref.Ref<Option.Option<Either.Either<Request.Request.Error<A>, Request.Request.Success<A>>>>
): BlockedRequest<A> => new BlockedRequestImpl(request, result)
