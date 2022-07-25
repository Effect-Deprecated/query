import { User } from "@effect/query/test/test-utils/Sources"
import { GetNameById, userNames } from "@effect/query/test/test-utils/UserRequest"

describe.concurrent("Query", () => {
  it("N + 1 selects problem", () =>
    Do(($) => {
      $(UserRequest.getAllUserNames.run)
      const logSize = $(TestConsole.logSize)
      assert.strictEqual(logSize, 2)
    }).provideSomeLayer(TestConsole.live).unsafeRunPromise())

  it("mapError does not prevent batching", () =>
    Do(($) => {
      const a = UserRequest
        .getUserNameById(1)
        .zip(UserRequest.getUserNameById(2)).mapError(identity)
      const b = UserRequest
        .getUserNameById(3)
        .zip(UserRequest.getUserNameById(4)).mapError(identity)
      $(Query.collectAllPar(List(a, b)).run)
      const logSize = $(TestConsole.logSize)
      assert.strictEqual(logSize, 2)
    }).provideSomeLayer(TestConsole.live).unsafeRunPromise())

  it("failure to complete request is query failure", () =>
    Do(($) => {
      const result = $(UserRequest.getUserNameById(27).run.exit())
      assert.deepStrictEqual(
        result.untraced,
        Exit.die(
          QueryFailure({
            dataSource: UserRequest.DataSource,
            request: GetNameById({ id: 27 })
          })
        )
      )
    }).provideSomeLayer(TestConsole.live).unsafeRunPromise())

  it("query failure is correctly reported", () => {
    const failure = QueryFailure({
      dataSource: UserRequest.DataSource,
      request: GetNameById({ id: 27 })
    })
    assert.strictEqual(
      failure.message,
      "Data source UserRequestDataSource did not complete request GetNameById."
    )
  })

  it("timed does not prevent batching", () =>
    Do(($) => {
      const a = UserRequest.getUserNameById(1).zip(UserRequest.getUserNameById(2)).timed
      const b = UserRequest.getUserNameById(3).zip(UserRequest.getUserNameById(4)).timed
      $(Query.collectAllPar(List(a, b)).run)
      const logSize = $(TestConsole.logSize)
      assert.strictEqual(logSize, 2)
    }).provideSomeLayer(TestConsole.live).unsafeRunPromise())

  it("optional converts a query to one that returns its value optionally", () =>
    Do(($) => {
      const result = $(UserRequest.getUserNameById(27).optional.run)
      assert.isTrue(result == Maybe.none)
    }).provideSomeLayer(TestConsole.live).unsafeRunPromise())

  it("stack safety", () =>
    Do(($) => {
      const query = Chunk.range(0, 100_000)
        .map((n) => Query.succeed(n))
        .reduce(Query.succeed(0), (query1, query2) =>
          query1.flatMap((acc) => query2.map((i) => acc + i)))
      const result = $(query.run)
      assert.strictEqual(result, 5_000_050_000)
    }).unsafeRunPromise())

  it("data sources can be raced", () =>
    Do(($) => {
      const raceDataSource = DataSource.never.race(SucceedRequest.DataSource)
      const deferred = $(Deferred.make<never, void>())
      const raceQuery = Query.fromRequest(SucceedRequest({ deferred }), raceDataSource)
      $(raceQuery.run)
      const result = $(deferred.await())
      assert.isUndefined(result)
    }).unsafeRunPromise())

  it("max batch size", () =>
    Do(($) => {
      const query = UserRequest.getAllUserNames.apply(Query.maxBatchSize(3))
      const result = $(query.run)
      const logSize = $(TestConsole.logSize)
      assert.isTrue(Chunk.from(userNames.values) == result)
      assert.strictEqual(logSize, 10)
    }).provideLayer(TestConsole.live).unsafeRunPromise())

  it("multiple data sources do not prevent batching", () =>
    Do(($) => {
      $(Query.collectAllPar(Chunk(FooRequest.getFoo, BarRequest.getBar)).run)
      const logSize = $(TestConsole.logSize)
      assert.strictEqual(logSize, 2)
    }).provideLayer(TestConsole.live).unsafeRunPromise())

  it("efficiency of large queries", () =>
    Do(($) => {
      const query = Do(($) => {
        const users = $(
          Query.fromEffect(Effect.succeed(Chunk.fill(
            Sources.totalCount,
            (id) => User({ id, name: "username", addressId: id, paymentId: id })
          )))
        )
        const richUsers = $(
          Query.forEachPar(users, (user) =>
            Sources
              .getPayment(user.paymentId)
              .zip(Sources.getAddress(user.addressId))
              .map(({ tuple: [payment, address] }) => Tuple(user, payment, address)))
        )
        return richUsers.length
      })
      const result = $(query.run)
      assert.strictEqual(result, Sources.totalCount)
    }))

  it("data sources can return additional results", () =>
    Do(($) => {
      const getSome = Query.forEachPar(List(3, 4), TestRequest.get).map(HashSet.from)
      const query = TestRequest.getAll.zipRight(getSome)
      const result = $(query.run)
      const output = $(TestConsole.output)
      assert.isTrue(result == HashSet("c", "d"))
      assert.isTrue(output == Chunk("getAll called"))
    }).provideLayer(TestConsole.live).unsafeRunPromise())

  it("requests can be removed from the cache", () =>
    Do(($) => {
      const cache = $(Cache.empty)
      const query = Do(($) => {
        $(UserRequest.getUserNameById(1))
        $(Query.fromEffect(cache.remove(GetNameById({ id: 1 }))))
        $(UserRequest.getUserNameById(1))
      })
      $(query.runCache(cache))
      const logSize = $(TestConsole.logSize)
      assert.strictEqual(logSize, 2)
    }).provideLayer(TestConsole.live).unsafeRunPromise())

  it("regional caching should work with parallelism", () =>
    Do(($) => {
      const left = UserRequest.getUserNameById(1)
        .zipRight(Query.fromEffect(Effect.sleep((50).millis)))
        .zipRight(UserRequest.getUserNameById(1))
        .unit
      const right = UserRequest.getUserNameById(2)
        .zipRight(Query.fromEffect(Effect.sleep((10).millis)))
        .unit
      const query = left.uncached.zipPar(right.cached)
      const fiber = $(query.run.fork())
      $(Effect.sleep((20).millis))
      $(Effect.sleep((70).millis))
      $(fiber.join())
      const logSize = $(TestConsole.logSize)
      assert.strictEqual(logSize, 1)
    }).provideLayer(TestConsole.live).unsafeRunPromise())

  describe.concurrent("zip", () => {
    it("arbitrary effects are executed in order", () =>
      Do(($) => {
        const ref = $(Ref.make(List.empty<number>()))
        const query1 = Query.fromEffect(ref.update((list) => list.prepend(1)))
        const query2 = Query.fromEffect(ref.update((list) => list.prepend(2)))
        $(query1.zipRight(query2).run)
        const result = $(ref.get())
        assert.isTrue(result == List(2, 1))
      }).unsafeRunPromise())

    it("requests are executed in order", () =>
      Do(($) => {
        const query = CacheRequest.put(0, 1)
          .zipRight(CacheRequest.getAll)
          .zipLeft(CacheRequest.put(1, -1))
        const result = $(query.run)
        assert.isTrue(result == HashMap(Tuple(0, 1)))
      }).provideSomeLayer(CacheRequest.DataSource.live).unsafeRunPromise())

    it("requests are pipelined", () =>
      Do(($) => {
        const query = CacheRequest.put(0, 1)
          .zipRight(CacheRequest.getAll)
          .zipLeft(CacheRequest.put(1, -1))
        const result = $(query.run.zipRight(CacheRequest.log))
        assert.strictEqual(result.length, 1)
      }))

    it("intervening flatMap prevents pipelining", () =>
      Do(($) => {
        const query = CacheRequest.put(0, 1)
          .flatMap((_) => Query.succeed(_))
          .zipRight(CacheRequest.getAll)
          .zipLeft(CacheRequest.put(1, -1))
        const result = $(query.run.zipRight(CacheRequest.log))
        assert.strictEqual(result.length, 2)
      }).provideSomeLayer(CacheRequest.DataSource.live).unsafeRunPromise())

    it("trailing flatMap does not prevent pipelining", () =>
      Do(($) => {
        const query = CacheRequest.put(0, 1)
          .zipRight(CacheRequest.getAll)
          .zipLeft(CacheRequest.put(1, -1))
          .flatMap((map) => Query.succeed(map))
        const result = $(query.run.zipRight(CacheRequest.log))
        assert.strictEqual(result.length, 1)
      }).provideSomeLayer(CacheRequest.DataSource.live).unsafeRunPromise())

    it("short circuits on failure", () =>
      Do(($) => {
        const ref = $(Ref.make(true))
        const query = Query.fail("fail").zipRight(Query.fromEffect(ref.set(false)))
        $(query.run.ignore())
        const result = $(ref.get())
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("does not deduplicate uncached requests", () =>
      Do(($) => {
        const query = CacheRequest.getAll
          .zipRight(CacheRequest.put(0, 1))
          .zipRight(CacheRequest.getAll)
        const result = $(query.uncached.run)
        assert.isTrue(result == HashMap(Tuple(0, 1)))
      }).provideSomeLayer(CacheRequest.DataSource.live).unsafeRunPromise())
  })

  describe.concurrent("zipBatched", () => {
    it("queries to multiple data sources can be executed in parallel", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        $(NeverRequest.neverQuery.zipBatched(SucceedRequest.succeedQuery(deferred)).run.fork())
        const result = $(deferred.await())
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("arbitrary effects are executed in order", () =>
      Do(($) => {
        const ref = $(Ref.make(List.empty<number>()))
        const query1 = Query.fromEffect(ref.update((list) => list.prepend(1)))
        const query2 = Query.fromEffect(ref.update((list) => list.prepend(2)))
        $(query1.zipBatchedRight(query2).run)
        const result = $(ref.get())
        assert.isTrue(result == List(2, 1))
      }).unsafeRunPromise())
  })

  describe.concurrent("zipPar", () => {
    it("queries to multiple data sources can be executed in parallel", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        $(NeverRequest.neverQuery.zipPar(SucceedRequest.succeedQuery(deferred)).run.fork())
        const result = $(deferred.await())
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("arbitrary effects can be executed in parallel", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        $(Query.never.zipPar(Query.fromEffect(deferred.succeed(undefined))).run.fork())
        const result = $(deferred.await())
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("does not prevent batching", () =>
      Do(($) => {
        $(Query.collectAllPar(Chunk.fill(2, () => UserRequest.getAllUserNames)).run)
        const logSize = $(TestConsole.logSize)
        assert.strictEqual(logSize, 2)
      }).provideLayer(TestConsole.live).unsafeRunPromise())
  })

  describe.concurrent("timeout", () => {
    it("times out a query that does not complete", () =>
      Do(($) => {
        const fiber = $(Query.never.timeout((10).millis).run.fork())
        const result = $(Effect.sleep((20).millis).zipRight(fiber.join()).unit())
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("prevents subsequent requests to data sources from being executed", () =>
      Do(($) => {
        const fiber = $(
          (Query.fromEffect(Effect.sleep((20).millis)).zipRight(NeverRequest.neverQuery))
            .timeout((10).millis)
            .run
            .fork()
        )
        const result = $(Effect.sleep((50).millis).zipRight(fiber.join()).unit())
        assert.isUndefined(result)
      }).unsafeRunPromise())
  })

  describe.concurrent("race", () => {
    it("race with never", () =>
      Do(($) => {
        const query = Query.never.race(Query.succeed(undefined))
        const result = $(query.run)
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("interruption of loser", () =>
      Do(($) => {
        const deferred1 = $(Deferred.make<never, void>())
        const deferred2 = $(Deferred.make<never, void>())
        const left = Query.fromEffect(
          deferred1
            .succeed(undefined)
            .zipRight(Effect.never)
            .onInterrupt(() => deferred2.succeed(undefined))
        )
        const right = Query.fromEffect(deferred1.await())
        $(left.race(right).run)
        const result = $(deferred2.await())
        assert.isUndefined(result)
      }).unsafeRunPromise())
  })

  describe.concurrent("around data source aspect", () => {
    it("wraps data source with before and after effects that are evaluated accordingly", () =>
      Do(($) => {
        const beforeRef = $(Ref.make(0))
        const before = beforeRef.set(1).zipRight(beforeRef.get())
        const afterRef = $(Ref.make(0))
        const after = (n: number) => afterRef.set(n * 2)
        const query = UserRequest.getUserNameById(1).apply(Query.around(
          Described(before, "before effect"),
          Described(after, "after effect")
        ))
        $(query.run)
        const beforeRun = $(beforeRef.get())
        const afterRun = $(afterRef.get())
        assert.strictEqual(beforeRun, 1)
        assert.strictEqual(afterRun, 2)
      }).provideLayer(TestConsole.live).unsafeRunPromise())
  })
})
