import { Ref } from '@effect-ts/system/Ref'
import { Option } from '@effect-ts/core/Classic/Option'
import { Either } from '@effect-ts/core/Classic/Either'

/**
 * A `BlockedRequest[A]` keeps track of a request of type `A` along with a
 * `Ref` containing the result of the request, existentially hiding the result
 * type. This is used internally by the library to support data sources that
 * return different result types for different requests while guaranteeing that
 * results will be of the type requested.
 */
export class BlockedRequest<A> {
    readonly _A!: A

    // TODO: existential types here, "any" needs to be of type E
    constructor(
        public readonly request: Request<any, A>,
        public readonly result: Ref<Option<Either<any, A>>>
    ){}
}

export function fromRequestResult<E, A, B>(request: A, result: Ref<Option<Either<E, B>>>): BlockedRequest<A> {
    return new BlockedRequest(request, result as any)
}