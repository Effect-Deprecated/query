import { Continue } from "@effect/query/_internal/Continue/definition"
import type { Request } from "@effect/query/Request"

/**
 * Constructs a continuation from a request, a data source, and a `Ref` that
 * will contain the result of the request when it is executed.
 *
 * @tsplus static effect/query/Continue.Ops __call
 * @tsplus static effect/query/Continue.Ops make
 */
export function make<R, A extends Request<any, any>>(
  request: A,
  dataSource: DataSource<R, A>,
  ref: Ref<Maybe<Either<Request.GetE<A>, Request.GetA<A>>>>
): Continue<R, Request.GetE<A>, Request.GetA<A>> {
  return Continue.get(
    ref.get().flatMap((maybe) => {
      switch (maybe._tag) {
        case "None": {
          return Effect.die(QueryFailure({ dataSource, request }))
        }
        case "Some": {
          return Effect.fromEither(maybe.value)
        }
      }
    })
  )
}
