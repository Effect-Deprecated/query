// port of: https://github.com/zio/zio-query/blob/3f9f4237ca2d879b629163f23fe79045eb29f0b0/zio-query/shared/src/main/scala/zio/query/internal/BlockedRequest.scala
import type { Either } from "@effect-ts/core/Either"
import type { Option } from "@effect-ts/core/Option"
import type { _A, _E } from "@effect-ts/core/Utils"
import type { Ref } from "@effect-ts/system/Ref"

import type { Request } from "../../Request"

/**
 * A `BlockedRequest[A]` keeps track of a request of type `A` along with a
 * `Ref` containing the result of the request, existentially hiding the result
 * type. This is used internally by the library to support data sources that
 * return different result types for different requests while guaranteeing that
 * results will be of the type requested.
 */

export interface BlockedRequest<A> {
  <R>(go: <E, B>(full: BlockedRequestFull<A, E, B>) => R): R
}

interface BlockedRequestFull<A, E, B> {
  _A: () => A
  request: Request<E, B>
  result: Ref<Option<Either<E, B>>>
}

export function of<A extends Request<any, any>>(
  request: A,
  result: Ref<Option<Either<_E<A>, _A<A>>>>
): BlockedRequest<A> {
  return (_) => _({ request, result, _A: undefined as any })
}
