/**
 * Constructs a data source from a function taking a collection of requests
 * and returning a `CompletedRequestMap`.
 *
 * @tsplus static effect/query/DataSource.Ops makeBatched
 */
export function makeBatched<R, A>(
  identifier: string,
  run: (requests: Chunk<A>) => Effect<R, never, CompletedRequestMap>
): DataSource<R, A> {
  return DataSource.make(
    identifier,
    (requests) => {
      return Effect.reduce(
        requests,
        CompletedRequestMap.empty,
        (completedRequestMap, requests) => {
          const newRequests: Chunk<A> = requests.filter((a) => !completedRequestMap.contains(a))
          return newRequests.isEmpty ?
            Effect.succeed(completedRequestMap) :
            run(newRequests).map((map) => completedRequestMap.concat(map))
        }
      )
    }
  )
}
