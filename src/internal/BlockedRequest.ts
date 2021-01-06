import { Ref } from "@effect-ts/system/Ref";
import { Option } from "@effect-ts/core/Classic/Option";
import { Either } from "@effect-ts/core/Classic/Either";
import { Request } from "src/Request";
import { _A, _E } from "@effect-ts/core/Utils";

/**
 * A `BlockedRequest[A]` keeps track of a request of type `A` along with a
 * `Ref` containing the result of the request, existentially hiding the result
 * type. This is used internally by the library to support data sources that
 * return different result types for different requests while guaranteeing that
 * results will be of the type requested.
 */

export interface BlockedRequest<A> {
  <R>(go: <E, B>(full: BlockedRequestFull<A, E, B>) => R): R;
}

interface BlockedRequestFull<A, E, B> {
  request: Request<E, B>;
  result: Ref<Option<Either<E, B>>>;
}

export function of<A extends Request<any, any>>(
  request: A,
  result: Ref<Option<Either<_E<A>, _A<A>>>>
): BlockedRequest<A> {
  return (_) => _({ request, result });
}
