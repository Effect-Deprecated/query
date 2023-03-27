import * as Chunk from "@effect/data/Chunk"
import * as Context from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import * as HashSet from "@effect/data/HashSet"
import type * as Option from "@effect/data/Option"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Ref from "@effect/io/Ref"
import * as DataSource from "@effect/query/DataSource"
import * as Query from "@effect/query/Query"
import * as Request from "@effect/query/Request"

export type CacheRequest = Get | GetAll | Put

export interface Get extends Request.Request<never, Option.Option<number>> {
  readonly _tag: "Get"
  readonly key: number
}

export const Get = Request.tagged<Get>("Get")

export interface GetAll extends Request.Request<never, HashMap.HashMap<number, number>> {
  readonly _tag: "GetAll"
}

export const GetAll = Request.tagged<GetAll>("GetAll")

export interface Put extends Request.Request<never, void> {
  readonly _tag: "Put"
  readonly key: number
  readonly value: number
}

export const Put = Request.tagged<Put>("Put")

export interface CacheDataSource {
  readonly dataSource: DataSource.DataSource<never, CacheRequest>
  clear(): Effect.Effect<never, never, void>
  log(): Effect.Effect<never, never, ReadonlyArray<ReadonlyArray<HashSet.HashSet<CacheRequest>>>>
}

export const CacheDataSource: Context.Tag<CacheDataSource, CacheDataSource> = Context.Tag<CacheDataSource>()

export const layer: Layer.Layer<never, never, CacheDataSource> = Layer.effect(
  CacheDataSource,
  Effect.map(
    Effect.all(
      Ref.make(HashMap.empty<number, number>()),
      Ref.make<ReadonlyArray<ReadonlyArray<HashSet.HashSet<CacheRequest>>>>([])
    ),
    ([cache, ref]): CacheDataSource => ({
      dataSource: DataSource.make(
        "CacheDataSource",
        (requests) =>
          Effect.zipRight(
            Ref.update(
              ref,
              ReadonlyArray.prepend(pipe(
                Chunk.map(requests, HashSet.fromIterable),
                Chunk.toReadonlyArray
              ))
            ),
            Effect.forEachDiscard(requests, (requests) =>
              Effect.forEachParDiscard(requests, (request) => {
                switch (request._tag) {
                  case "Get": {
                    return Request.completeEffect(request, Effect.map(Ref.get(cache), HashMap.get(request.key)))
                  }
                  case "GetAll": {
                    return Request.completeEffect(request, Ref.get(cache))
                  }
                  case "Put": {
                    return Request.completeEffect(request, Ref.update(cache, HashMap.set(request.key, request.value)))
                  }
                }
              }))
          )
      ),
      log: (): Effect.Effect<never, never, ReadonlyArray<ReadonlyArray<HashSet.HashSet<CacheRequest>>>> => Ref.get(ref),
      clear: (): Effect.Effect<never, never, void> => Effect.zipRight(Ref.set(cache, HashMap.empty()), Ref.set(ref, []))
    })
  )
)

export const get = (key: number): Query.Query<CacheDataSource, never, Option.Option<number>> =>
  pipe(
    Query.context<CacheDataSource>(),
    Query.map(Context.get(CacheDataSource)),
    Query.flatMap((cache) => Query.fromRequest(Get({ key }), cache.dataSource))
  )

export const getAll = (): Query.Query<CacheDataSource, never, HashMap.HashMap<number, number>> =>
  pipe(
    Query.context<CacheDataSource>(),
    Query.map(Context.get(CacheDataSource)),
    Query.flatMap((cache) => Query.fromRequest(GetAll({}), cache.dataSource))
  )

export const put = (key: number, value: number): Query.Query<CacheDataSource, never, void> =>
  pipe(
    Query.context<CacheDataSource>(),
    Query.map(Context.get(CacheDataSource)),
    Query.flatMap((cache) => Query.fromRequest(Put({ key, value }), cache.dataSource))
  )

export const clear = (): Effect.Effect<CacheDataSource, never, void> =>
  Effect.flatMap(CacheDataSource, (cache) => cache.clear())

export const log = (): Effect.Effect<
  CacheDataSource,
  never,
  ReadonlyArray<ReadonlyArray<HashSet.HashSet<CacheRequest>>>
> => Effect.flatMap(CacheDataSource, (cache) => cache.log())
