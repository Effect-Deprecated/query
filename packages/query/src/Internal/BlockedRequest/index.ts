// ets_tracing: off

// port of: https://github.com/zio/zio-query/blob/3f9f4237ca2d879b629163f23fe79045eb29f0b0/zio-query/shared/src/main/scala/zio/query/internal/BlockedRequest.scala
import { _A } from "@effect-ts/core/Effect"
import type { Either } from "@effect-ts/core/Either"
import type { Option } from "@effect-ts/core/Option"
import type { _A as _GetA, _E as _GetE } from "@effect-ts/core/Utils"
import type { Ref } from "@effect-ts/system/Ref"

import type { Request } from "../../Request/index.js"

export const BlockedRequestSym = Symbol.for("@effect-ts/query/Internal/BlockedRequest")
export type BlockedRequestSym = typeof BlockedRequestSym

/**
 * A `BlockedRequest[A]` keeps track of a request of type `A` along with a
 * `Ref` containing the result of the request, existentially hiding the result
 * type. This is used internally by the library to support data sources that
 * return different result types for different requests while guaranteeing that
 * results will be of the type requested.
 */
export class BlockedRequest<A> {
  readonly [_A]!: () => A;
  readonly [BlockedRequestSym]: BlockedRequestSym = BlockedRequestSym
  constructor(
    readonly request: Request<_GetE<A>, _GetA<A>>,
    readonly result: Ref<Option<Either<_GetE<A>, _GetA<A>>>>
  ) {}
}

export function of<A extends Request<any, any>>(
  request: A,
  result: Ref<Option<Either<_GetE<A>, _GetA<A>>>>
): BlockedRequest<A> {
  return new BlockedRequest(request, result)
}
