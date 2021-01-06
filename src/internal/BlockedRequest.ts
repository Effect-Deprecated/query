import { Ref } from "@effect-ts/system/Ref";
import { Option } from "@effect-ts/core/Classic/Option";
import { Either } from "@effect-ts/core/Classic/Either";
import { Request } from "src/Request";

/**
 * A `BlockedRequest[A]` keeps track of a request of type `A` along with a
 * `Ref` containing the result of the request, existentially hiding the result
 * type. This is used internally by the library to support data sources that
 * return different result types for different requests while guaranteeing that
 * results will be of the type requested.
 */
export interface BlockedRequest<A> {
  <E, B>(): { request: Request<E, A>; result: Ref<Option<Either<E, B>>> };
}

export function of<E, B, A extends Request<E, B>>(
  request: A,
  result: Ref<Option<Either<E, B>>>
): BlockedRequest<A> {
  return () => ({ request: request as any, result: result as any });
}
