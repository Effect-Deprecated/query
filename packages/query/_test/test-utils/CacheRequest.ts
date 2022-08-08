/**
 * @tsplus type effect/query/CacheRequest
 */
export type CacheRequest = Get | GetAll | Put

export declare namespace CacheRequest {
  export type DataSource = CacheRequestDataSource
}

/**
 * @tsplus type effect/query/test/CacheRequest.DataSource
 */
export interface CacheRequestDataSource extends DataSource<never, CacheRequest> {
  readonly clear: Effect<never, never, void>
  readonly log: Effect<never, never, List<List<HashSet<CacheRequest>>>>
}

/**
 * @tsplus type effect/query/test/CacheRequest.DataSource.Ops
 */
export interface CacheRequestDataSourceOps {
  readonly Tag: Tag<CacheRequestDataSource>
}
export const CacheRequestDataSource: CacheRequestDataSourceOps = {
  Tag: Tag<CacheRequestDataSource>()
}

/**
 * @tsplus type effect/query/test/CacheRequest.Ops
 */
export interface CacheRequestOps {
  readonly DataSource: CacheRequestDataSourceOps
}
export const CacheRequest: CacheRequestOps = {
  DataSource: CacheRequestDataSource
}

export interface Get extends Request<never, Maybe<number>> {
  readonly _tag: "Get"
  readonly key: number
}
/**
 * @tsplus static effect/query/test/CacheRequest.Ops Get
 */
export const Get = Request.tagged<Get>("Get")

export interface GetAll extends Request<never, HashMap<number, number>> {
  readonly _tag: "GetAll"
}
/**
 * @tsplus static effect/query/test/CacheRequest.Ops GetAll
 */
export const GetAll = Request.tagged<GetAll>("GetAll")

export interface Put extends Request<never, void> {
  readonly _tag: "Put"
  readonly key: number
  readonly value: number
}
/**
 * @tsplus static effect/query/test/CacheRequest.Ops Put
 */
export const Put = Request.tagged<Put>("Put")

/**
 * @tsplus static effect/query/test/CacheRequest.DataSource.Ops live
 */
export const live: Layer<never, never, CacheRequestDataSource> = Layer.fromEffect(
  CacheRequestDataSource.Tag,
  Do(($) => {
    const cache = $(Ref.make(HashMap.empty<number, number>()))
    const ref = $(Ref.make(List.empty<List<HashSet<CacheRequest>>>()))
    return {
      identifier: "CacheDataSource",
      clear: cache.set(HashMap.empty()).zipRight(ref.set(List.empty())),
      log: ref.get,
      runAll: (requests) =>
        ref.update((list) => list.prepend(requests.map(HashSet.from).toList)).zipRight(
          Effect.forEach(requests, (requests) =>
            Effect.forEachPar(requests, (request) => {
              switch (request._tag) {
                case "Get": {
                  return cache.get.map((map) => map.get(request.key))
                }
                case "GetAll": {
                  return cache.get
                }
                case "Put": {
                  return cache.update((map) => map.set(request.key, request.value))
                }
              }
            }).map((_) =>
              requests.zip(_).reduce(CompletedRequestMap.empty, (map, { tuple: [k, v] }) =>
                map.insert(k as any, Either.right(v)))
            )).map((requests) => requests.reduce(CompletedRequestMap.empty, (a, b) => a.concat(b)))
        )
    } as CacheRequestDataSource
  })
)

/**
 * @tsplus static effect/query/test/CacheRequest.Ops get
 */
export function get(key: number): Query<CacheRequestDataSource, never, Maybe<number>> {
  return Do(($) => {
    const cache = $(
      Query.environment<CacheRequestDataSource>().map((env) => env.get(CacheRequestDataSource.Tag))
    )
    return $(Query.fromRequest(CacheRequest.Get({ key }), cache))
  })
}

/**
 * @tsplus static effect/query/test/CacheRequest.Ops getAll
 */
export const getAll: Query<CacheRequestDataSource, never, HashMap<number, number>> = Do(($) => {
  const cache = $(
    Query.environment<CacheRequestDataSource>().map((env) => env.get(CacheRequestDataSource.Tag))
  )
  return $(Query.fromRequest(CacheRequest.GetAll({}), cache))
})

/**
 * @tsplus static effect/query/test/CacheRequest.Ops put
 */
export function put(key: number, value: number): Query<CacheRequestDataSource, never, void> {
  return Do(($) => {
    const cache = $(
      Query.environment<CacheRequestDataSource>().map((env) => env.get(CacheRequestDataSource.Tag))
    )
    return $(Query.fromRequest(CacheRequest.Put({ key, value }), cache))
  })
}

/**
 * @tsplus static effect/query/test/CacheRequest.Ops clear
 */
export const clear: Effect<CacheRequestDataSource, never, void> = Effect.serviceWithEffect(
  CacheRequestDataSource.Tag,
  (cache) => cache.clear
)

/**
 * @tsplus static effect/query/test/CacheRequest.Ops log
 */
export const log: Effect<CacheRequestDataSource, never, List<List<HashSet<CacheRequest>>>> = Effect
  .serviceWithEffect(
    CacheRequestDataSource.Tag,
    (cache) => cache.log
  )
