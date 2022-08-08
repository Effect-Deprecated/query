import { BlockedRequest } from "@effect/query/_internal/BlockedRequest"
import { BlockedRequests } from "@effect/query/_internal/BlockedRequests"
import { Continue } from "@effect/query/_internal/Continue/definition"
import { Result } from "@effect/query/_internal/Result/definition"
import { cachingEnabled } from "@effect/query/Query/operations/_internal/cachingEnabled"
import { currentCache } from "@effect/query/Query/operations/_internal/currentCache"
import { QueryInternal } from "@effect/query/Query/operations/_internal/QueryInternal"
import type { Request } from "@effect/query/Request"

/**
 * Constructs a query from a request and a data source. Queries will die with
 * a `QueryFailure` when run if the data source does not provide results for
 * all requests received. Queries must be constructed with `fromRequest` or
 * one of its variants for optimizations to be applied.
 *
 * @tsplus static effect/query/Query.Ops fromRequest
 */
export function fromRequest<R, A extends Request<any, any>>(
  request: A,
  dataSource: DataSource<R, A>
): Query<R, Request.GetE<A>, Request.GetA<A>> {
  return new QueryInternal(
    cachingEnabled.get.flatMap((cachingEnabled) => {
      if (cachingEnabled) {
        return currentCache.get.flatMap((cache) => {
          return cache.lookup(request).flatMap((either) => {
            switch (either._tag) {
              case "Left": {
                return Effect.succeed(Result.blocked(
                  BlockedRequests.single(dataSource, BlockedRequest(request, either.left)),
                  Continue(request, dataSource, either.left)
                ))
              }
              case "Right": {
                return either.right.get.map((maybe) => {
                  switch (maybe._tag) {
                    case "None": {
                      return Result.blocked(
                        BlockedRequests.empty,
                        Continue(request, dataSource, either.right)
                      )
                    }
                    case "Some": {
                      return Result.fromEither(maybe.value)
                    }
                  }
                })
              }
            }
          })
        })
      }
      return Ref.make(Maybe.empty<Either<Request.GetE<A>, Request.GetA<A>>>()).map((ref) =>
        Result.blocked(
          BlockedRequests.single(dataSource, BlockedRequest(request, ref)),
          Continue(request, dataSource, ref)
        )
      )
    })
  )
}
