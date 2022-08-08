import type { Request } from "@effect/query/Request"

/**
 * Constructs a data source from a pure function.
 *
 * @tsplus static effect/query/DataSource.Ops fromFunction
 */
export function fromFunction<A extends Request<any, any>>(
  name: string,
  f: (a: A) => Request.GetA<A>
): DataSource<never, A> {
  return DataSource.makeBatched(
    name,
    (requests) =>
      Effect.succeed(
        requests.reduce(CompletedRequestMap.empty, (map, k) => map.insert(k, Either.right(f(k))))
      )
  )
}
