import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as TestClock from "@effect/io/internal_effect_untraced/testing/testClock"
import * as Ref from "@effect/io/Ref"
import * as Cache from "@effect/query/Cache"
import * as DataSource from "@effect/query/DataSource"
import * as Described from "@effect/query/Described"
import * as Query from "@effect/query/Query"
import * as QueryFailure from "@effect/query/QueryFailure"
import * as Request from "@effect/query/Request"
import * as CacheRequest from "@effect/query/test/utils/CacheRequest"
import * as it from "@effect/query/test/utils/extend"
import * as Sources from "@effect/query/test/utils/Sources"
import * as TestConsole from "@effect/query/test/utils/TestConsole"
import * as TestRequest from "@effect/query/test/utils/TestRequest"
import * as UserRequest from "@effect/query/test/utils/UserRequest"
import { identity, pipe } from "@fp-ts/core/Function"
import * as Option from "@fp-ts/core/Option"
import * as ReadonlyArray from "@fp-ts/core/ReadonlyArray"
import * as Duration from "@fp-ts/data/Duration"
import * as HashMap from "@fp-ts/data/HashMap"
import * as HashSet from "@fp-ts/data/HashSet"
import { describe, expect } from "vitest"

interface NeverRequest extends Request.Request<never, never> {}
const NeverRequest = Request.of<NeverRequest>()
const neverQuery: Query.Query<never, never, never> = Query.fromRequest(NeverRequest({}), DataSource.never())

interface SuccessRequest extends Request.Request<never, void> {
  readonly deferred: Deferred.Deferred<never, void>
}
const SuccessRequest = Request.of<SuccessRequest>()
const successDataSource: DataSource.DataSource<never, SuccessRequest> = DataSource.fromFunctionEffect(
  "succeed",
  (request) => Effect.asUnit(Deferred.succeed(request.deferred, void 0))
)
const successQuery = (deferred: Deferred.Deferred<never, void>): Query.Query<never, never, void> =>
  Query.fromRequest(SuccessRequest({ deferred }), successDataSource)

const raceDataSource: DataSource.DataSource<never, SuccessRequest> = DataSource.race(
  DataSource.never(),
  successDataSource
)
const raceQuery = (deferred: Deferred.Deferred<never, void>): Query.Query<never, never, void> =>
  Query.fromRequest(SuccessRequest({ deferred }), raceDataSource)

describe.concurrent("Query", () => {
  it.effect("n + 1 selects problem", () =>
    Effect.gen(function*($) {
      yield* $(UserRequest.getAllUserNames)
      const log = yield* $(TestConsole.output)
      expect(log).toHaveLength(2)
    }))

  it.effect("mapError does not prevent batching", () =>
    Effect.gen(function*($) {
      const a = pipe(
        Query.zip(
          UserRequest.getUserNameById(1),
          UserRequest.getUserNameById(2)
        ),
        Query.mapError(identity)
      )
      const b = pipe(
        Query.zip(
          UserRequest.getUserNameById(3),
          UserRequest.getUserNameById(4)
        ),
        Query.mapError(identity)
      )
      yield* $(Query.collectAllPar([a, b]))
      const log = yield* $(TestConsole.output)
      expect(log).toHaveLength(2)
    }))

  it.effect("failure to complete request is query failure", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        UserRequest.getUserNameById(27),
        Effect.exit
      ))
      expect(Exit.unannotate(result)).toEqual(
        Exit.die(QueryFailure.make(UserRequest.UserDataSource, UserRequest.GetNameById({ id: 27 })))
      )
    }))

  it.it("query failure is correctly reported", () => {
    const failure = QueryFailure.make(UserRequest.UserDataSource, UserRequest.GetNameById({ id: 27 }))
    expect(failure.message()).toBe("Data source UserRequestDataSource did not complete request GetNameById")
  })

  it.effect("timed does not prevent batching", () =>
    Effect.gen(function*($) {
      const a = pipe(
        Query.zip(
          UserRequest.getUserNameById(1),
          UserRequest.getUserNameById(2)
        ),
        Query.timed,
        Query.map((tuple) => tuple[1])
      )
      const b = Query.zip(
        UserRequest.getUserNameById(3),
        UserRequest.getUserNameById(4)
      )
      yield* $(Query.collectAllPar([a, b]))
      const log = yield* $(TestConsole.output)
      expect(log).toHaveLength(2)
    }))

  it.effect("optional converts a query to one that returns its value optionally", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        UserRequest.getUserNameById(27),
        Query.map(identity),
        Query.optional,
        Query.run
      ))
      expect(result).toEqual(Option.none())
    }))

  it.effect("zip - arbitrary effects are executed in order", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make<ReadonlyArray<number>>([]))
      const query1 = Query.fromEffect(Ref.update(ref, ReadonlyArray.append(1)))
      const query2 = Query.fromEffect(Ref.update(ref, ReadonlyArray.append(2)))
      yield* $(Query.zipRight(query1, query2))
      const result = yield* $(Ref.get(ref))
      expect(result).toEqual([1, 2])
    }))

  it.effect("zip - requests are executed in order", () =>
    Effect.gen(function*($) {
      const query = pipe(
        CacheRequest.put(0, 1),
        Query.zipRight(CacheRequest.getAll()),
        Query.zipLeft(CacheRequest.put(1, -1))
      )
      const result = yield* $(pipe(
        query,
        Effect.provideLayer(CacheRequest.layer)
      ))
      expect(result).toEqual(HashMap.make([0, 1]))
    }))

  it.effect("zip - requests are pipelined", () =>
    Effect.gen(function*($) {
      const query = pipe(
        CacheRequest.put(0, 1),
        Query.zipRight(CacheRequest.getAll()),
        Query.zipLeft(CacheRequest.put(1, -1))
      )
      const log = yield* $(pipe(
        query,
        Effect.zipRight(CacheRequest.log()),
        Effect.provideLayer(CacheRequest.layer)
      ))
      expect(log).toHaveLength(1)
    }))

  it.effect("zip - intervening flatMap prevents pipelining", () =>
    Effect.gen(function*($) {
      const query = pipe(
        CacheRequest.put(0, 1),
        Query.flatMap(() => Query.succeed(0)),
        Query.zipRight(CacheRequest.getAll()),
        Query.zipLeft(CacheRequest.put(1, -1))
      )
      const log = yield* $(pipe(
        query,
        Effect.zipRight(CacheRequest.log()),
        Effect.provideLayer(CacheRequest.layer)
      ))
      expect(log).toHaveLength(2)
    }))

  it.effect("zip - trailing flatMap does not prevent pipelining", () =>
    Effect.gen(function*($) {
      const query = pipe(
        CacheRequest.put(0, 1),
        Query.zipRight(CacheRequest.getAll()),
        Query.zipLeft(CacheRequest.put(1, -1)),
        Query.flatMap(() => Query.succeed(0))
      )
      const log = yield* $(pipe(
        query,
        Effect.zipRight(CacheRequest.log()),
        Effect.provideLayer(CacheRequest.layer)
      ))
      expect(log).toHaveLength(1)
    }))

  it.effect("zip - short circuits on failure", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(true))
      const query = pipe(
        Query.fail("fail"),
        Query.zipRight(Query.fromEffect(Ref.set(ref, false)))
      )
      yield* $(pipe(
        query,
        Effect.catchAll(Effect.unit)
      ))
      const result = yield* $(Ref.get(ref))
      expect(result).toEqual(true)
    }))

  it.effect("zip - does not deduplicate uncached requests", () =>
    Effect.gen(function*($) {
      const query = pipe(
        CacheRequest.getAll(),
        Query.zipRight(CacheRequest.put(0, 1)),
        Query.zipRight(CacheRequest.getAll())
      )
      const result = yield* $(pipe(
        Query.uncached(query),
        Effect.provideLayer(CacheRequest.layer)
      ))
      expect(result).toEqual(HashMap.make([0, 1]))
    }))

  it.effect("zipBatched - queries to multiple data sources can be executed in parallel", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, void>())
      const query = pipe(neverQuery, Query.zipBatched(successQuery(deferred)))
      yield* $(pipe(
        query,
        Effect.fork
      ))
      const result = yield* $(Deferred.await(deferred))
      expect(result).toBeUndefined()
    }))

  it.effect("zipBatched - arbitrary effects are executed in order", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make<ReadonlyArray<number>>([]))
      const query1 = Query.fromEffect(Ref.update(ref, ReadonlyArray.prepend(1)))
      const query2 = Query.fromEffect(Ref.update(ref, ReadonlyArray.prepend(2)))
      yield* $(Query.zipBatchedRight(query1, query2))
      const result = yield* $(Ref.get(ref))
      expect(result).toEqual([2, 1])
    }))

  it.effect("zipPar - queries to multiple data sources can be executed in parallel", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, void>())
      yield* $(pipe(
        neverQuery,
        Query.zipPar(successQuery(deferred)),
        Query.run,
        Effect.fork
      ))
      const result = yield* $(Deferred.await(deferred))
      expect(result).toBeUndefined()
    }))

  it.effect("zipPar - arbitrary effects are executed in parallel", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, void>())
      yield* $(pipe(
        Query.never(),
        Query.zipPar(Query.fromEffect(Deferred.succeed(deferred, void 0))),
        Query.run,
        Effect.fork
      ))
      const result = yield* $(Deferred.await(deferred))
      expect(result).toBeUndefined()
    }))

  it.effect("zipPar - short circuits on failure", () =>
    Effect.gen(function*($) {
      yield* $(pipe(
        Array.from({ length: 100 }, () => UserRequest.getAllUserNames),
        Query.collectAllPar,
        Query.run
      ))
      const log = yield* $(TestConsole.output)
      expect(log).toHaveLength(2)
    }))

  it.effect("stack safety", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        Array.from({ length: 10_000 }, (_, i) => Query.succeed(i)).reduce(
          (acc, curr) => Query.zipWith(acc, curr, (a, b) => a + b),
          Query.succeed(0)
        ),
        Query.run
      ))
      expect(result).toEqual(49_995_000)
    }))

  it.effect("data sources can be raced", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, void>())
      yield* $(raceQuery(deferred))
      const result = yield* $(Deferred.await(deferred))
      expect(result).toBeUndefined()
    }))

  it.effect("max batch size", () =>
    Effect.gen(function*($) {
      const query = pipe(
        UserRequest.getAllUserNames,
        Query.maxBatchSize(3)
      )
      const result = yield* $(query)
      const log = yield* $(TestConsole.output)
      expect(result).toEqual(Array.from(UserRequest.userNames.values()))
      expect(log).toHaveLength(10)
    }))

  it.effect("multiple data sources do not prevent batching", () =>
    Effect.gen(function*($) {
      yield* $(pipe(
        Query.collectAllPar([UserRequest.getAllUserNames, UserRequest.getAllUserNames]),
        Query.run
      ))
      const log = yield* $(TestConsole.output)
      expect(log).toHaveLength(2)
    }))

  it.effect("efficiency of large queries", () =>
    Effect.gen(function*($) {
      const query = pipe(
        Array.from(
          { length: Sources.totalCount },
          (_, id) => Sources.User({ id, name: "user name", paymentId: id, addressId: id })
        ),
        Query.forEachPar((user) =>
          pipe(
            Sources.getPayment(user.paymentId),
            Query.zipWith(
              Sources.getAddress(user.addressId),
              (payment, address) => [user, payment, address] as const
            )
          )
        )
      )
      const result = yield* $(query)
      expect(result).toHaveLength(Sources.totalCount)
    }))

  it.effect("data sources can return additional results", () =>
    Effect.gen(function*($) {
      const getSome = pipe(
        Query.forEachPar([3, 4], TestRequest.get),
        Query.map(HashSet.fromIterable)
      )
      const query = Query.zipRight(TestRequest.getAll, getSome)
      const result = yield* $(query)
      const log = yield* $(TestConsole.output)
      expect(result).toEqual(HashSet.fromIterable(["c", "d"]))
      expect(log).toEqual(["getAll called"])
    }))

  it.effect("requests can be removed from the cache", () =>
    Effect.gen(function*($) {
      const cache = yield* $(Cache.empty())
      const query = pipe(
        UserRequest.getUserNameById(1),
        Query.flatMap(() => Query.fromEffect(cache.remove(UserRequest.GetNameById({ id: 1 })))),
        Query.flatMap(() => UserRequest.getUserNameById(1))
      )
      yield* $(Query.runCache(query, cache))
      const log = yield* $(TestConsole.output)
      expect(log).toHaveLength(2)
    }))

  it.effect("timeout - times out a query that does not complete", () =>
    Effect.gen(function*($) {
      const fiber = yield* $(pipe(
        Query.never(),
        Query.timeout(Duration.seconds(1)),
        Query.run,
        Effect.fork
      ))
      yield* $(TestClock.adjust(Duration.seconds(1)))
      const result = yield* $(Fiber.join(fiber))
      expect(result).toEqual(Option.none())
    }))

  it.effect("timeout - prevents subsequent requests to data sources from being executed", () =>
    Effect.gen(function*($) {
      const fiber = yield* $(pipe(
        Query.zipRight(
          Query.fromEffect(Effect.sleep(Duration.seconds(2))),
          neverQuery
        ),
        Query.timeout(Duration.seconds(1)),
        Query.run,
        Effect.fork
      ))
      yield* $(TestClock.adjust(Duration.seconds(2)))
      yield* $(Fiber.join(fiber))
    }))

  it.effect("regional caching should work with parallelism", () =>
    Effect.gen(function*($) {
      const left = pipe(
        UserRequest.getUserNameById(1),
        Query.flatMap(() => Query.fromEffect(Effect.sleep(Duration.millis(1000)))),
        Query.flatMap(() => UserRequest.getUserNameById(1))
      )
      const right = pipe(
        UserRequest.getUserNameById(2),
        Query.flatMap(() => Query.fromEffect(Effect.sleep(Duration.millis(500))))
      )
      const query = Query.zipPar(Query.uncached(left), Query.cached(right))
      const fiber = yield* $(Effect.fork(query))
      yield* $(TestClock.adjust(Duration.millis(500)))
      yield* $(TestClock.adjust(Duration.millis(1000)))
      yield* $(Fiber.join(fiber))
      const log = yield* $(TestConsole.output)
      expect(log).toHaveLength(2)
      expect(log[0]).toContain("GetNameById(1)")
      expect(log[0]).toContain("GetNameById(2)")
      expect(log[1]).toContain("GetNameById(1)")
    }))

  it.effect("race - race with never", () =>
    Effect.gen(function*($) {
      const query = Query.race(Query.never(), Query.succeed(void 0))
      const result = yield* $(query)
      expect(result).toBeUndefined()
    }))

  it.effect("race - interruption of loser", () =>
    Effect.gen(function*($) {
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const left = Query.fromEffect(pipe(
        Deferred.succeed(deferred1, void 0),
        Effect.zipRight(Effect.never()),
        Effect.onInterrupt(() => Deferred.succeed(deferred2, void 0))
      ))
      const right = Query.fromEffect(Deferred.await(deferred1))
      const result = yield* $(Query.race(left, right))
      yield* $(Deferred.await(deferred2))
      expect(result).toBeUndefined()
    }))

  it.effect("around", () =>
    Effect.gen(function*($) {
      const beforeRef = yield* $(Ref.make(0))
      const before = pipe(
        Ref.set(beforeRef, 1),
        Effect.zipRight(Ref.get(beforeRef))
      )
      const afterRef = yield* $(Ref.make(0))
      const after = (v: number) => Ref.set(afterRef, v * 2)
      const query = Query.around(
        UserRequest.getUserNameById(1),
        Described.make(before, "before effect"),
        Described.make(after, "after effect")
      )
      yield* $(query)
      const isBeforeRan = yield* $(Ref.get(beforeRef))
      const isAfterRan = yield* $(Ref.get(afterRef))
      expect(isBeforeRan).toBe(1)
      expect(isAfterRan).toBe(2)
    }))
})
