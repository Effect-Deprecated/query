import * as Chunk from "@effect/data/Chunk"
import type * as Context from "@effect/data/Context"
import * as Duration from "@effect/data/Duration"
import * as Equal from "@effect/data/Equal"
import * as Hash from "@effect/data/Hash"
import * as HashSet from "@effect/data/HashSet"
import * as Cause from "@effect/io/Cause"
import * as Clock from "@effect/io/Clock"
import * as Debug from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import * as Exit from "@effect/io/Exit"
import * as Fiber from "@effect/io/Fiber"
import * as FiberRef from "@effect/io/FiberRef"
import * as Layer from "@effect/io/Layer"
import * as Ref from "@effect/io/Ref"
import * as Cache from "@effect/query/Cache"
import type * as DataSource from "@effect/query/DataSource"
import type * as Described from "@effect/query/Described"
import * as BlockedRequest from "@effect/query/internal_effect_untraced/blockedRequest"
import * as BlockedRequests from "@effect/query/internal_effect_untraced/blockedRequests"
import * as cache from "@effect/query/internal_effect_untraced/cache"
import * as completedRequestMap from "@effect/query/internal_effect_untraced/completedRequestMap"
import * as Continue from "@effect/query/internal_effect_untraced/continue"
import * as dataSource from "@effect/query/internal_effect_untraced/dataSource"
import * as described from "@effect/query/internal_effect_untraced/described"
import * as queryFailure from "@effect/query/internal_effect_untraced/queryFailure"
import * as Result from "@effect/query/internal_effect_untraced/result"
import * as Sequential from "@effect/query/internal_effect_untraced/sequential"
import type * as Query from "@effect/query/Query"
import type * as Request from "@effect/query/Request"
import * as Either from "@fp-ts/core/Either"
import type { LazyArg } from "@fp-ts/core/Function"
import { identity, pipe } from "@fp-ts/core/Function"
import * as Option from "@fp-ts/core/Option"
import * as ReadonlyArray from "@fp-ts/core/ReadonlyArray"

/** @internal */
const QuerySymbolKey = "@effect/query/Query"

/** @internal */
export const QueryTypeId: Query.QueryTypeId = Symbol.for(
  QuerySymbolKey
) as Query.QueryTypeId

/** @internal */
const queryVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
class QueryImpl<R, E, A> implements Query.Query<R, E, A> {
  readonly _tag = "Commit"
  readonly [QueryTypeId] = queryVariance
  constructor(readonly step: Effect.Effect<R, never, Result.Result<R, E, A>>, readonly trace?: Debug.Trace) {}

  [Equal.symbol](that: unknown) {
    return this === that
  }

  [Hash.symbol]() {
    return Hash.random(this)
  }

  readonly [Effect.EffectTypeId] = queryVariance

  traced(trace: Debug.Trace): Query.Query<R, E, A> {
    if (trace) {
      return new QueryImpl(matchCauseQuery(this, failCause, succeed).step.traced(trace))
    }
    return this
  }

  commit() {
    return run(this)
  }
}

const cachingEnabled: FiberRef.FiberRef<boolean> = FiberRef.unsafeMake(true)

const currentCache: FiberRef.FiberRef<Cache.Cache> = FiberRef.unsafeMake(cache.unsafeMake())

/** @internal */
export const absolve = Debug.untracedMethod(() =>
  <R, E, A>(self: Query.Query<R, E, Either.Either<E, A>>): Query.Query<R, E, A> => flatMap(self, fromEither)
)

/** @internal */
export const around = Debug.untracedDual<
  <R, E, A, R2, A2, R3, _>(
    self: Query.Query<R, E, A>,
    before: Described.Described<Effect.Effect<R2, never, A2>>,
    after: Described.Described<(a: A2) => Effect.Effect<R3, never, _>>
  ) => Query.Query<R | R2 | R3, E, A>,
  <R2, A2, R3, _>(
    before: Described.Described<Effect.Effect<R2, never, A2>>,
    after: Described.Described<(a: A2) => Effect.Effect<R3, never, _>>
  ) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R | R2 | R3, E, A>
>(3, () => (self, before, after) => mapDataSources(self, (source) => dataSource.around(source, before, after)))

/** @internal */
export const as = Debug.untracedDual<
  <R, E, A, A2>(self: Query.Query<R, E, A>, value: A2) => Query.Query<R, E, A2>,
  <A2>(value: A2) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R, E, A2>
>(2, () => (self, value) => map(self, () => value))

/** @internal */
export const asSomeError = Debug.untracedMethod(() =>
  <R, E, A>(self: Query.Query<R, E, A>): Query.Query<R, Option.Option<E>, A> => mapError(self, Option.some)
)

/** @internal */
export const asUnit = Debug.untracedMethod(() =>
  <R, E, A>(self: Query.Query<R, E, A>): Query.Query<R, E, void> => as(self, void 0)
)

/** @internal */
export const cached = Debug.untracedMethod(() =>
  <R, E, A>(self: Query.Query<R, E, A>): Query.Query<R, E, A> =>
    pipe(
      fromEffect(FiberRef.getAndSet(cachingEnabled, true)),
      flatMap((previous) => ensuring(self, fromEffect(FiberRef.set(cachingEnabled, previous))))
    )
)

/** @internal */
export const catchAll = Debug.untracedDual<
  <R, A, E, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    f: (error: E) => Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E2, A | A2>,
  <E, R2, E2, A2>(
    f: (error: E) => Query.Query<R2, E2, A2>
  ) => <R, A>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E2, A | A2>
>(2, (restore) => (self, f) => matchQuery(self, restore(f), succeed))

/** @internal */
export const catchAllCause = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    f: (cause: Cause.Cause<E>) => Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E2, A | A2>,
  <E, R2, E2, A2>(
    f: (cause: Cause.Cause<E>) => Query.Query<R2, E2, A2>
  ) => <R, A>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E2, A | A2>
>(2, (restore) => (self, f) => matchCauseQuery(self, restore(f), succeed))

/** @internal */
export const collectAll = Debug.untracedMethod(() =>
  <R, E, A>(queries: Iterable<Query.Query<R, E, A>>): Query.Query<R, E, Chunk.Chunk<A>> => forEach(queries, identity)
)

/** @internal */
export const collectAllBatched = Debug.untracedMethod(() =>
  <R, E, A>(queries: Iterable<Query.Query<R, E, A>>): Query.Query<R, E, Chunk.Chunk<A>> =>
    forEachBatched(queries, identity)
)

/** @internal */
export const collectAllPar = Debug.untracedMethod(() =>
  <R, E, A>(queries: Iterable<Query.Query<R, E, A>>): Query.Query<R, E, Chunk.Chunk<A>> => forEachPar(queries, identity)
)

/** @internal */
export const context = Debug.methodWithTrace((trace) =>
  <R>(_: void): Query.Query<R, never, Context.Context<R>> => fromEffect(Effect.context<R>().traced(trace))
)

/** @internal */
export const contextWith = Debug.untracedMethod((restore) =>
  <R, A>(f: (context: Context.Context<R>) => A): Query.Query<R, never, A> => map(context<R>(), restore(f))
)

/** @internal */
export const contextWithEffect = Debug.untracedMethod((restore) =>
  <R, R2, E, A>(f: (context: Context.Context<R>) => Effect.Effect<R2, E, A>): Query.Query<R | R2, E, A> =>
    mapEffect(context<R>(), restore(f))
)

/** @internal */
export const contextWithQuery = Debug.untracedMethod((restore) =>
  <R, R2, E, A>(f: (context: Context.Context<R>) => Query.Query<R2, E, A>): Query.Query<R | R2, E, A> =>
    flatMap(context<R>(), restore(f))
)

/** @internal */
export const contramapContext = Debug.dualWithTrace<
  <R, E, A, R0>(
    self: Query.Query<R, E, A>,
    f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
  ) => Query.Query<R0, E, A>,
  <R0, R>(
    f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
  ) => <E, A>(self: Query.Query<R, E, A>) => Query.Query<R0, E, A>
>(
  2,
  (trace, restore) =>
    <R, E, A, R0>(
      self: Query.Query<R, E, A>,
      f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
    ) =>
      new QueryImpl(
        Effect.contramapContext(
          Effect.map(self.step, (result) => contramapContextResult(result, f)),
          (context: Context.Context<R0>) => restore(f.value)(context)
        ).traced(trace)
      )
)

/** @internal */
export const die = Debug.methodWithTrace((trace) =>
  (defect: unknown): Query.Query<never, never, never> => new QueryImpl(Effect.die(defect).traced(trace))
)

/** @internal */
export const dieSync = Debug.methodWithTrace((trace, restore) =>
  (evaluate: LazyArg<unknown>): Query.Query<never, never, never> =>
    new QueryImpl(Effect.dieSync(restore(evaluate)).traced(trace))
)

/** @internal */
export const either = Debug.untracedMethod(() =>
  <R, E, A>(self: Query.Query<R, E, A>): Query.Query<R, never, Either.Either<E, A>> =>
    catchAll(map(self, Either.right), (e) => succeed(Either.left(e)))
)

/** @internal */
export const ensuring = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    finalizer: Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E | E2, A>,
  <R2, E2, A2>(
    finalizer: Query.Query<R2, E2, A2>
  ) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, A>
>(2, () =>
  (self, finalizer) =>
    matchCauseQuery(self, (cause1) =>
      matchCauseQuery(
        finalizer,
        (cause2) => failCause(Cause.sequential(cause1, cause2)),
        () => failCause(cause1)
      ), (value) => matchCauseQuery(finalizer, failCause, () => succeed(value))))

/** @internal */
export const fail = Debug.methodWithTrace((trace) =>
  <E>(error: E): Query.Query<never, E, never> =>
    new QueryImpl(Effect.succeed(Result.fail(Cause.fail(error))).traced(trace))
)

/** @internal */
export const failSync = Debug.methodWithTrace((trace, restore) =>
  <E>(evaluate: LazyArg<E>): Query.Query<never, E, never> =>
    new QueryImpl(Effect.sync(() => Result.fail(Cause.fail(restore(evaluate)()))).traced(trace))
)

/** @internal */
export const failCause = Debug.methodWithTrace((trace) =>
  <E>(cause: Cause.Cause<E>): Query.Query<never, E, never> =>
    new QueryImpl(Effect.succeed(Result.fail(cause)).traced(trace))
)

/** @internal */
export const failCauseSync = Debug.methodWithTrace((trace, restore) =>
  <E>(evaluate: LazyArg<Cause.Cause<E>>): Query.Query<never, E, never> =>
    new QueryImpl(Effect.sync(() => Result.fail(restore(evaluate)())).traced(trace))
)

/** @internal */
export const flatMap = Debug.dualWithTrace<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    f: (a: A) => Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E | E2, A2>,
  <A, R2, E2, A2>(
    f: (a: A) => Query.Query<R2, E2, A2>
  ) => <R, E>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, A2>
>(2, (trace, restore) =>
  (self, f) =>
    new QueryImpl(
      Effect.flatMap(self.step, (result) => {
        switch (result._tag) {
          case "Blocked": {
            return Effect.succeed(
              Result.blocked(
                result.blockedRequests,
                mapQueryContinuation(result.continue, restore(f))
              )
            )
          }
          case "Done": {
            return restore(f)(result.value).step
          }
          case "Fail": {
            return Effect.succeed(Result.fail(result.cause))
          }
        }
      }).traced(trace)
    ))

/** @internal */
export const flatten = Debug.untracedMethod(() =>
  <R, E, R2, E2, A>(
    self: Query.Query<R, E, Query.Query<R2, E2, A>>
  ): Query.Query<R | R2, E | E2, A> => flatMap(self, identity)
)

/** @internal */
export const forEach = Debug.untracedDual<
  <A, R, E, B>(
    elements: Iterable<A>,
    f: (a: A) => Query.Query<R, E, B>
  ) => Query.Query<R, E, Chunk.Chunk<B>>,
  <A, R, E, B>(
    f: (a: A) => Query.Query<R, E, B>
  ) => (
    elements: Iterable<A>
  ) => Query.Query<R, E, Chunk.Chunk<B>>
>(2, (restore) =>
  <A, R, E, B>(elements: Iterable<A>, f: (a: A) => Query.Query<R, E, B>) => {
    const iterator = restore(() => elements[Symbol.iterator]())()
    let result: Query.Query<R, E, Chunk.Chunk<B>> | undefined
    let next: IteratorResult<A, any>
    while ((next = iterator.next()) && !next.done) {
      if (result === undefined) {
        result = map(restore(f)(next.value), Chunk.of)
      } else {
        result = zipWith(
          result,
          restore(f)(next.value),
          (chunk, a) => pipe(chunk, Chunk.append(a))
        )
      }
    }
    return result !== undefined ? result : succeed(Chunk.empty())
  })

/** @internal */
export const forEachBatched = Debug.untracedDual<
  <A, R, E, B>(
    elements: Iterable<A>,
    f: (a: A) => Query.Query<R, E, B>
  ) => Query.Query<R, E, Chunk.Chunk<B>>,
  <A, R, E, B>(
    f: (a: A) => Query.Query<R, E, B>
  ) => (
    elements: Iterable<A>
  ) => Query.Query<R, E, Chunk.Chunk<B>>
>(2, (restore) =>
  <A, R, E, B>(elements: Iterable<A>, f: (a: A) => Query.Query<R, E, B>) => {
    const iterator = restore(() => elements[Symbol.iterator]())()
    let result: Query.Query<R, E, Chunk.Chunk<B>> | undefined
    let next: IteratorResult<A, any>
    while ((next = iterator.next()) && !next.done) {
      if (result === undefined) {
        result = map(restore(f)(next.value), Chunk.of)
      } else {
        result = zipWithBatched(
          result,
          restore(f)(next.value),
          (chunk, a) => pipe(chunk, Chunk.append(a))
        )
      }
    }
    return result !== undefined ? result : succeed(Chunk.empty())
  })

/** @internal */
export const forEachPar = Debug.untracedDual<
  <A, R, E, B>(
    elements: Iterable<A>,
    f: (a: A) => Query.Query<R, E, B>
  ) => Query.Query<R, E, Chunk.Chunk<B>>,
  <A, R, E, B>(
    f: (a: A) => Query.Query<R, E, B>
  ) => (
    elements: Iterable<A>
  ) => Query.Query<R, E, Chunk.Chunk<B>>
>(2, (restore) =>
  (elements, f) =>
    suspend(() => {
      const chunk = Chunk.fromIterable(elements)
      if (Chunk.isEmpty(chunk)) {
        return succeed(Chunk.empty())
      }
      if (Chunk.size(chunk) === 1) {
        return map(restore(f)(pipe(chunk, Chunk.unsafeGet(0))), Chunk.of)
      }
      return new QueryImpl(
        Effect.map(
          Effect.forEachPar(chunk, (a) => restore(f)(a).step),
          collectAllParResult
        )
      )
    }))

/** @internal */
export const fromEffect = Debug.methodWithTrace((trace) =>
  <R, E, A>(effect: Effect.Effect<R, E, A>): Query.Query<R, E, A> =>
    new QueryImpl(Effect.matchCause(effect, Result.fail, Result.done).traced(trace))
)

/** @internal */
export const fromEither = Debug.untracedMethod((): <E, A>(either: Either.Either<E, A>) => Query.Query<never, E, A> =>
  Either.match(fail, succeed)
)

/** @internal */
export const fromOption = Debug.untracedMethod((): <A>(
  option: Option.Option<A>
) => Query.Query<never, Option.Option<never>, A> => Option.match(() => fail(Option.none()), succeed))

/** @internal */
export const fromRequest = Debug.methodWithTrace((trace) =>
  <R, A extends Request.Request<any, any>, A2 extends A>(
    request: A,
    dataSource: DataSource.DataSource<R, A2>
  ): Query.Query<R, Request.Request.Error<A>, Request.Request.Success<A>> =>
    new QueryImpl(
      Effect.flatMap(FiberRef.get(cachingEnabled), (cachingEnabled) =>
        cachingEnabled
          ? Effect.flatMap(FiberRef.get(currentCache), (currentCache) =>
            Effect.flatMap(
              cache.lookup(currentCache, request),
              Either.match(
                (ref) =>
                  Effect.succeed(
                    Result.blocked(
                      BlockedRequests.single(dataSource, BlockedRequest.make(request, ref)),
                      Continue.make(request, dataSource, ref)
                    )
                  ),
                (ref) =>
                  Effect.map(
                    Ref.get(ref),
                    Option.match(
                      () =>
                        Result.blocked(
                          BlockedRequests.empty,
                          Continue.make(request, dataSource, ref)
                        ),
                      Result.fromEither
                    )
                  )
              )
            ))
          : Effect.map(
            Ref.make(Option.none<Either.Either<Request.Request.Error<A>, Request.Request.Success<A>>>()),
            (ref) =>
              Result.blocked(
                BlockedRequests.single(dataSource, BlockedRequest.make(request, ref)),
                Continue.make(request, dataSource, ref)
              )
          )).traced(trace)
    )
)

/** @internal */
export const fromRequestUncached = Debug.untracedMethod(() =>
  <R, A extends Request.Request<any, any>, A2 extends A>(request: A, dataSource: DataSource.DataSource<R, A2>) =>
    uncached(fromRequest(request, dataSource))
)

/** @internal */
export const left = Debug.untracedMethod(() =>
  <R, E, A, A2>(
    self: Query.Query<R, E, Either.Either<A, A2>>
  ): Query.Query<R, Either.Either<E, A2>, A> =>
    matchQuery(
      self,
      (e) => fail(Either.left(e)),
      Either.match(succeed, (a2) => fail(Either.right(a2)))
    )
)

/** @internal */
export const map = Debug.dualWithTrace<
  <R, E, A, B>(self: Query.Query<R, E, A>, f: (a: A) => B) => Query.Query<R, E, B>,
  <A, B>(f: (a: A) => B) => <R, E>(self: Query.Query<R, E, A>) => Query.Query<R, E, B>
>(2, (trace, restore) =>
  (self, f) =>
    new QueryImpl(
      Effect.map(
        self.step,
        (result) => mapResult(result, restore(f))
      ).traced(trace)
    ))

/** @internal */
export const mapBoth = Debug.untracedDual<
  <R, E, E2, A, A2>(self: Query.Query<R, E, A>, f: (e: E) => E2, g: (a: A) => A2) => Query.Query<R, E2, A2>,
  <E, E2, A, A2>(f: (e: E) => E2, g: (a: A) => A2) => <R>(self: Query.Query<R, E, A>) => Query.Query<R, E2, A2>
>(3, (restore) =>
  (self, f, g) =>
    matchQuery(
      self,
      (e) => fail(restore(f)(e)),
      (a) => succeed(restore(g)(a))
    ))

/** @internal */
export const mapDataSources = Debug.dualWithTrace<
  <R, E, A, R2>(
    self: Query.Query<R, E, A>,
    f: (dataSource: DataSource.DataSource<R, A>) => DataSource.DataSource<R2, A>
  ) => Query.Query<R | R2, E, A>,
  <R, A, R2>(
    f: (dataSource: DataSource.DataSource<R, A>) => DataSource.DataSource<R2, A>
  ) => <E>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E, A>
>(2, (trace, restore) =>
  (self, f) =>
    new QueryImpl(
      Effect.map(
        self.step,
        (result) => mapDataSourcesResult(result, restore(f))
      ).traced(trace)
    ))

/** @internal */
export const mapError = Debug.untracedDual<
  <R, A, E, E2>(self: Query.Query<R, E, A>, f: (e: E) => E2) => Query.Query<R, E2, A>,
  <E, E2>(f: (e: E) => E2) => <R, A>(self: Query.Query<R, E, A>) => Query.Query<R, E2, A>
>(2, (restore) => (self, f) => mapBoth(self, restore(f), identity))

/** @internal */
export const mapErrorCause = Debug.untracedDual<
  <R, E, A, E2>(self: Query.Query<R, E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) => Query.Query<R, E2, A>,
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) => <R, A>(self: Query.Query<R, E, A>) => Query.Query<R, E2, A>
>(2, (restore) => (self, f) => matchCauseQuery(self, (cause) => failCause(restore(f)(cause)), succeed))

/** @internal */
export const mapEffect = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, A2>
  ) => Query.Query<R | R2, E | E2, A2>,
  <A, R2, E2, A2>(
    f: (a: A) => Effect.Effect<R2, E2, A2>
  ) => <R, E>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, A2>
>(2, (restore) => (self, f) => flatMap(self, (a) => fromEffect(restore(f)(a))))

/** @internal */
export const match = Debug.untracedDual<
  <R, E, A, Z>(
    self: Query.Query<R, E, A>,
    onFailure: (error: E) => Z,
    onSuccess: (value: A) => Z
  ) => Query.Query<R, never, Z>,
  <E, Z, A>(
    onFailure: (error: E) => Z,
    onSuccess: (value: A) => Z
  ) => <R>(self: Query.Query<R, E, A>) => Query.Query<R, never, Z>
>(3, (restore) =>
  (self, onFailure, onSuccess) =>
    matchQuery(
      self,
      (e) => succeed(restore(onFailure)(e)),
      (a) => succeed(restore(onSuccess)(a))
    ))

/** @internal */
export const matchCauseQuery = Debug.dualWithTrace<
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Query.Query<R, E, A>,
    onFailure: (cause: Cause.Cause<E>) => Query.Query<R2, E2, A2>,
    onSuccess: (value: A) => Query.Query<R3, E3, A3>
  ) => Query.Query<R | R2 | R3, E2 | E3, A2 | A3>,
  <E, R2, E2, A2, A, R3, E3, A3>(
    onFailure: (cause: Cause.Cause<E>) => Query.Query<R2, E2, A2>,
    onSuccess: (value: A) => Query.Query<R3, E3, A3>
  ) => <R>(self: Query.Query<R, E, A>) => Query.Query<R | R2 | R3, E2 | E3, A2 | A3>
>(3, (trace, restore) =>
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Query.Query<R, E, A>,
    onFailure: (cause: Cause.Cause<E>) => Query.Query<R2, E2, A2>,
    onSuccess: (value: A) => Query.Query<R3, E3, A3>
  ) =>
    new QueryImpl(
      Effect.matchCauseEffect(
        self.step,
        (cause) => restore(onFailure)(cause).step,
        (result): Effect.Effect<
          R | R2 | R3,
          never,
          Result.Result<R | R2 | R3, E2 | E3, A2 | A3>
        > => {
          switch (result._tag) {
            case "Blocked": {
              return Effect.succeed(
                Result.blocked(
                  result.blockedRequests,
                  matchCauseQueryContination(result.continue, restore(onFailure), restore(onSuccess))
                )
              )
            }
            case "Done": {
              return restore(onSuccess)(result.value).step
            }
            case "Fail": {
              return restore(onFailure)(result.cause).step
            }
          }
        }
      ).traced(trace)
    ))

/** @internal */
export const matchQuery = Debug.untracedDual<
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Query.Query<R, E, A>,
    onFailure: (error: E) => Query.Query<R2, E2, A2>,
    onSuccess: (value: A) => Query.Query<R3, E3, A3>
  ) => Query.Query<R | R2 | R3, E2 | E3, A2 | A3>,
  <E, R2, E2, A2, A, R3, E3, A3>(
    onFailure: (error: E) => Query.Query<R2, E2, A2>,
    onSuccess: (value: A) => Query.Query<R3, E3, A3>
  ) => <R>(self: Query.Query<R, E, A>) => Query.Query<R | R2 | R3, E2 | E3, A2 | A3>
>(3, (restore) =>
  (self, onFailure, onSuccess) =>
    matchCauseQuery(self, (cause) =>
      pipe(
        Cause.failureOrCause(cause),
        Either.match(restore(onFailure), (a) => failCause(a))
      ), restore(onSuccess)))

/** @internal */
export const maxBatchSize = Debug.untracedDual<
  <R, E, A>(self: Query.Query<R, E, A>, n: number) => Query.Query<R, E, A>,
  (n: number) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R, E, A>
>(2, () => (self, n) => mapDataSources(self, (source) => dataSource.batchN(source, n)))

/** @internal */
export const never = Debug.untracedMethod(() =>
  (_: void): Query.Query<never, never, never> => fromEffect(Effect.never())
)

/** @internal */
export const optional = Debug.untracedMethod(() =>
  <R, E, A>(self: Query.Query<R, E, A>): Query.Query<R, E, Option.Option<A>> =>
    matchCauseQuery(self, (cause) =>
      pipe(
        Cause.stripSomeDefects(cause, (defect) =>
          queryFailure.isQueryFailure(defect) ?
            Option.some(void 0) :
            Option.none()),
        Option.match(succeedNone, failCause)
      ), succeedSome)
)

/** @internal */
export const orDie = Debug.untracedMethod(() =>
  <R, E, A>(self: Query.Query<R, E, A>): Query.Query<R, never, A> => orDieWith(self, identity)
)

/** @internal */
export const orDieWith = Debug.untracedDual<
  <R, E, A>(self: Query.Query<R, E, A>, f: (error: E) => unknown) => Query.Query<R, never, A>,
  <E>(f: (error: E) => unknown) => <R, A>(self: Query.Query<R, E, A>) => Query.Query<R, never, A>
>(2, (restore) => (self, f) => matchQuery(self, (e) => die(restore(f)(e)), succeed))

/** @internal */
export const partitionQuery = Debug.untracedDual<
  <A, R, E, B>(
    elements: Iterable<A>,
    f: (a: A) => Query.Query<R, E, B>
  ) => Query.Query<R, never, readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]>,
  <A, R, E, B>(
    f: (a: A) => Query.Query<R, E, B>
  ) => (
    elements: Iterable<A>
  ) => Query.Query<R, never, readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]>
>(2, (restore) =>
  (elements, f) =>
    map(
      forEach(elements, (a) => either(restore(f)(a))),
      partitionMap(identity)
    ))

/** @internal */
export const partitionQueryPar = Debug.untracedDual<
  <A, R, E, B>(
    elements: Iterable<A>,
    f: (a: A) => Query.Query<R, E, B>
  ) => Query.Query<R, never, readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]>,
  <A, R, E, B>(
    f: (a: A) => Query.Query<R, E, B>
  ) => (
    elements: Iterable<A>
  ) => Query.Query<R, never, readonly [Chunk.Chunk<E>, Chunk.Chunk<B>]>
>(2, (restore) =>
  (elements, f) =>
    map(
      forEachPar(elements, (a) => either(restore(f)(a))),
      partitionMap(identity)
    ))

/** @internal */
export const provideContext = Debug.untracedDual<
  <R, E, A>(
    self: Query.Query<R, E, A>,
    context: Described.Described<Context.Context<R>>
  ) => Query.Query<never, E, A>,
  <R>(
    context: Described.Described<Context.Context<R>>
  ) => <E, A>(
    self: Query.Query<R, E, A>
  ) => Query.Query<never, E, A>
>(2, () => (self, context) => contramapContext(self, described.make(() => context.value, context.description)))

/** @internal */
export const provideLayer = Debug.dualWithTrace<
  <R, E, A, R0, E2>(
    self: Query.Query<R, E, A>,
    layer: Described.Described<Layer.Layer<R0, E2, R>>
  ) => Query.Query<R0, E | E2, A>,
  <R0, E2, R>(
    layer: Described.Described<Layer.Layer<R0, E2, R>>
  ) => <E, A>(self: Query.Query<R, E, A>) => Query.Query<R0, E | E2, A>
>(2, (trace) =>
  <R, E, A, R0, E2>(
    self: Query.Query<R, E, A>,
    layer: Described.Described<Layer.Layer<R0, E2, R>>
  ) =>
    new QueryImpl(
      Effect.scoped(
        pipe(
          Effect.exit(Layer.build(layer.value)),
          Effect.flatMap(Exit.match(
            (e): Effect.Effect<R0, never, Result.Result<R0, E | E2, A>> => Effect.succeed(Result.fail(e)),
            (c) => provideContext(self, described.make(c, layer.description)).step
          ))
        )
      ).traced(trace)
    ))

/** @internal */
export const provideSomeLayer = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    layer: Described.Described<Layer.Layer<R2, E2, A2>>
  ) => Query.Query<R2 | Exclude<R, A2>, E | E2, A>,
  <R2, E2, A2>(
    layer: Described.Described<Layer.Layer<R2, E2, A2>>
  ) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R2 | Exclude<R, A2>, E2 | E, A>
>(
  2,
  () =>
    <R, E, A, R2, E2, A2>(self: Query.Query<R, E, A>, layer: Described.Described<Layer.Layer<R2, E2, A2>>) =>
      provideLayer(
        // @ts-expect-error
        self,
        described.make(Layer.merge(Layer.context<R2>(), layer.value), layer.description)
      )
)

/** @internal */
export const race = Debug.dualWithTrace<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E | E2, A | A2>,
  <R2, E2, A2>(
    that: Query.Query<R2, E2, A2>
  ) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, A | A2>
>(2, (trace) =>
  <R, E, A, R2, E2, A2>(self: Query.Query<R, E, A>, that: Query.Query<R2, E2, A2>) => {
    const coordinate = (
      exit: Exit.Exit<never, Result.Result<R | R2, E | E2, A | A2>>,
      fiber: Fiber.Fiber<never, Result.Result<R | R2, E | E2, A | A2>>
    ): Effect.Effect<R | R2, never, Result.Result<R | R2, E | E2, A | A2>> =>
      Exit.matchEffect(
        exit,
        (cause1) =>
          Effect.map(
            Fiber.join(fiber),
            (result) => mapErrorCauseResult(result, (cause2) => Cause.parallel(cause1, cause2))
          ),
        (result) => {
          switch (result._tag) {
            case "Blocked": {
              switch (result.continue._tag) {
                case "Eff": {
                  return Effect.succeed(
                    Result.blocked(
                      result.blockedRequests,
                      Continue.eff(raceInternal(result.continue.query, fiber))
                    )
                  )
                }
                case "Get": {
                  return Effect.succeed(
                    Result.blocked(
                      result.blockedRequests,
                      Continue.eff(raceInternal(fromEffect(result.continue.effect), fiber))
                    )
                  )
                }
              }
            }
            case "Done": {
              return Effect.zipRight(
                Fiber.interrupt(fiber),
                Effect.succeed(Result.done(result.value))
              )
            }
            case "Fail": {
              return Effect.map(
                Fiber.join(fiber),
                (result2) => mapErrorCauseResult(result2, (cause2) => Cause.parallel(result.cause, cause2))
              )
            }
          }
        }
      )
    const raceInternal = (
      query: Query.Query<R | R2, E | E2, A | A2>,
      fiber: Fiber.Fiber<never, Result.Result<R | R2, E | E2, A | A2>>
    ): Query.Query<R | R2, E | E2, A | A2> =>
      new QueryImpl(Effect.raceWith(query.step, Fiber.join(fiber), coordinate, coordinate))
    return new QueryImpl(Effect.raceWith(self.step, that.step, coordinate, coordinate).traced(trace))
  })

/** @internal */
export const refineOrDie = Debug.untracedDual<
  <R, E, A, E2>(self: Query.Query<R, E, A>, pf: (error: E) => Option.Option<E2>) => Query.Query<R, E2, A>,
  <E, E2>(pf: (error: E) => Option.Option<E2>) => <R, A>(self: Query.Query<R, E, A>) => Query.Query<R, E2, A>
>(2, (restore) => (self, pf) => refineOrDieWith(self, restore(pf), identity))

/** @internal */
export const refineOrDieWith = Debug.untracedDual<
  <R, E, A, E2>(
    self: Query.Query<R, E, A>,
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ) => Query.Query<R, E2, A>,
  <E, E2>(
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ) => <R, A>(self: Query.Query<R, E, A>) => Query.Query<R, E2, A>
>(3, (restore) =>
  (self, pf, f) =>
    catchAll(
      self,
      (e) => pipe(restore(pf)(e), Option.match(() => die(restore(f)(e)), fail))
    ))

/** @internal */
export const right = Debug.untracedMethod(() =>
  <R, E, A, A2>(
    self: Query.Query<R, E, Either.Either<A, A2>>
  ): Query.Query<R, Either.Either<A, E>, A2> =>
    matchQuery(
      self,
      (e) => fail(Either.right(e)),
      (e) => pipe(e, Either.match((a) => fail(Either.left(a)), succeed))
    )
)

/** @internal */
export const run = Debug.methodWithTrace((trace) =>
  <R, E, A>(self: Query.Query<R, E, A>): Effect.Effect<R, E, A> =>
    Effect.map(runLog(self), (tuple) => tuple[1]).traced(trace)
)

/** @internal */
export const runCache = Debug.dualWithTrace<
  <R, E, A>(self: Query.Query<R, E, A>, cache: Cache.Cache) => Effect.Effect<R, E, A>,
  (cache: Cache.Cache) => <R, E, A>(self: Query.Query<R, E, A>) => Effect.Effect<R, E, A>
>(2, (trace) =>
  <R, E, A>(self: Query.Query<R, E, A>, cache: Cache.Cache) => {
    const runInternal = (query: Query.Query<R, E, A>): Effect.Effect<R, E, A> =>
      Effect.flatMap(query.step, (result) => {
        switch (result._tag) {
          case "Blocked": {
            switch (result.continue._tag) {
              case "Eff": {
                return Effect.zipRight(
                  runBlockedRequests(result.blockedRequests),
                  runInternal(result.continue.query)
                )
              }
              case "Get": {
                return Effect.zipRight(
                  runBlockedRequests(result.blockedRequests),
                  result.continue.effect
                )
              }
            }
          }
          case "Done": {
            return Effect.succeed(result.value)
          }
          case "Fail": {
            return Effect.failCause(result.cause)
          }
        }
      })
    return FiberRef.locally(runInternal(self), currentCache, cache).traced(trace)
  })

/** @internal */
export const runLog = Debug.methodWithTrace((trace) =>
  <R, E, A>(self: Query.Query<R, E, A>): Effect.Effect<R, E, readonly [Cache.Cache, A]> =>
    Effect.flatMap(cache.empty(), (cache) =>
      Effect.map(
        runCache(self, cache),
        (a) => [cache, a] as const
      )).traced(trace)
)

/** @internal */
export const sandbox = Debug.untracedMethod(() =>
  <R, E, A>(self: Query.Query<R, E, A>): Query.Query<R, Cause.Cause<E>, A> => matchCauseQuery(self, fail, succeed)
)

/** @internal */
export const sandboxWith = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    f: (self: Query.Query<R, Cause.Cause<E>, A>) => Query.Query<R2, Cause.Cause<E2>, A2>
  ) => Query.Query<R | R2, E2, A | A2>,
  <R, E, A, R2, E2, A2>(
    f: (self: Query.Query<R, Cause.Cause<E>, A>) => Query.Query<R2, Cause.Cause<E2>, A2>
  ) => (self: Query.Query<R, E, A>) => Query.Query<R | R2, E2, A | A2>
>(2, (restore) => (self, f) => unsandbox(restore(f)(sandbox(self))))

/** @internal */
export const service = Debug.methodWithTrace((trace) =>
  <T>(tag: Context.Tag<T>): Query.Query<T, never, T> => fromEffect(Effect.service(tag).traced(trace))
)

/** @internal */
export const serviceWith = Debug.untracedMethod((restore) =>
  <T extends Context.Tag<any>, A>(
    tag: T,
    f: (a: Context.Tag.Service<T>) => A
  ): Query.Query<Context.Tag.Service<T>, never, A> => map(service(tag), restore(f))
)

/** @internal */
export const serviceWithEffect = Debug.untracedMethod((restore) =>
  <T extends Context.Tag<any>, R, E, A>(
    tag: T,
    f: (a: Context.Tag.Service<T>) => Effect.Effect<R, E, A>
  ): Query.Query<R | Context.Tag.Service<T>, E, A> => mapEffect(service(tag), restore(f))
)

/** @internal */
export const serviceWithQuery = Debug.untracedMethod((restore) =>
  <T extends Context.Tag<any>, R, E, A>(
    tag: T,
    f: (a: Context.Tag.Service<T>) => Query.Query<R, E, A>
  ): Query.Query<R | Context.Tag.Service<T>, E, A> => flatMap(service(tag), restore(f))
)

/** @internal */
export const some = Debug.untracedMethod(() =>
  <R, E, A>(self: Query.Query<R, E, Option.Option<A>>): Query.Query<R, Option.Option<E>, A> =>
    matchQuery(
      self,
      (e) => fail(Option.some(e)),
      Option.match(() => fail(Option.none()), succeed)
    )
)

/** @internal */
export const someOrElse = Debug.untracedDual<
  <R, E, A, B>(self: Query.Query<R, E, Option.Option<A>>, def: LazyArg<B>) => Query.Query<R, E, A | B>,
  <A, B>(def: LazyArg<B>) => <R, E>(self: Query.Query<R, E, Option.Option<A>>) => Query.Query<R, E, A | B>
>(2, (restore) => (self, def) => map(self, Option.getOrElse(restore(def))))

/** @internal */
export const someOrElseEffect = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, Option.Option<A>>,
    def: LazyArg<Query.Query<R2, E2, A2>>
  ) => Query.Query<R | R2, E | E2, A | A2>,
  <R2, E2, A2>(
    def: LazyArg<Query.Query<R2, E2, A2>>
  ) => <R, E, A>(self: Query.Query<R, E, Option.Option<A>>) => Query.Query<R | R2, E | E2, A | A2>
>(
  2,
  (restore) =>
    <R, E, A, R2, E2, A2>(self: Query.Query<R, E, Option.Option<A>>, def: LazyArg<Query.Query<R2, E2, A2>>) =>
      flatMap(self, Option.match(restore(def), (a) => succeed<A | A2>(a)))
)

/** @internal */
export const someOrFail = Debug.untracedDual<
  <R, E, A, E2>(self: Query.Query<R, E, Option.Option<A>>, error: LazyArg<E2>) => Query.Query<R, E | E2, A>,
  <E2>(error: LazyArg<E2>) => <R, E, A>(self: Query.Query<R, E, Option.Option<A>>) => Query.Query<R, E | E2, A>
>(2, (restore) => (self, error) => flatMap(self, Option.match(() => failSync(restore(error)), succeed)))

/** @internal */
export const succeed = Debug.methodWithTrace((trace) =>
  <A>(value: A): Query.Query<never, never, A> => new QueryImpl(Effect.succeed(Result.done(value)).traced(trace))
)

/** @internal */
export const succeedNone = Debug.untracedMethod(() =>
  (_: void): Query.Query<never, never, Option.Option<never>> => succeed(Option.none())
)

/** @internal */
export const succeedSome = Debug.untracedMethod(() =>
  <A>(value: A): Query.Query<never, never, Option.Option<A>> => succeed(Option.some(value))
)

/** @internal */
export const summarized = Debug.untracedDual<
  <R, E, A, R2, E2, B, C>(
    self: Query.Query<R, E, A>,
    summary: Effect.Effect<R2, E2, B>,
    f: (start: B, end: B) => C
  ) => Query.Query<R | R2, E | E2, readonly [C, A]>,
  <R2, E2, B, C>(
    summary: Effect.Effect<R2, E2, B>,
    f: (start: B, end: B) => C
  ) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, readonly [C, A]>
>(3, (restore) =>
  (self, summary, f) =>
    flatMap(
      fromEffect(summary),
      (start) =>
        flatMap(
          self,
          (value) =>
            map(
              fromEffect(summary),
              (end) => [restore(f)(start, end), value] as const
            )
        )
    ))

/** @internal */
export const suspend = Debug.untracedMethod((restore) =>
  <R, E, A>(evaluate: LazyArg<Query.Query<R, E, A>>): Query.Query<R, E, A> => flatMap(unit(), restore(evaluate))
)

/** @internal */
export const sync = Debug.methodWithTrace((trace, restore) =>
  <A>(evaluate: LazyArg<A>): Query.Query<never, never, A> =>
    new QueryImpl(Effect.sync(() => Result.done(restore(evaluate)())).traced(trace))
)

/** @internal */
export const timed = Debug.untracedMethod(() =>
  <R, E, A>(self: Query.Query<R, E, A>): Query.Query<R, E, readonly [Duration.Duration, A]> =>
    summarized(self, Clock.currentTimeMillis(), (start, end) => Duration.millis(end - start))
)

/** @internal */
export const timeout = Debug.untracedDual<
  <R, E, A>(self: Query.Query<R, E, A>, duration: Duration.Duration) => Query.Query<R, E, Option.Option<A>>,
  (duration: Duration.Duration) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R, E, Option.Option<A>>
>(2, () => (self, duration) => timeoutTo(self, Option.none(), Option.some, duration))

/** @internal */
export const timeoutFail = Debug.untracedDual<
  <R, E, A, E2>(
    self: Query.Query<R, E, A>,
    error: LazyArg<E2>,
    duration: Duration.Duration
  ) => Query.Query<R, E | E2, A>,
  <E2>(
    error: LazyArg<E2>,
    duration: Duration.Duration
  ) => <R, E, A>(
    self: Query.Query<R, E, A>
  ) => Query.Query<R, E | E2, A>
>(3, (restore) =>
  (self, error, duration) =>
    flatten(timeoutTo(
      self,
      failSync(restore(error)),
      succeed,
      duration
    )))

/** @internal */
export const timeoutFailCause = Debug.untracedDual<
  <R, E, A, E2>(
    self: Query.Query<R, E, A>,
    evaluate: LazyArg<Cause.Cause<E2>>,
    duration: Duration.Duration
  ) => Query.Query<R, E | E2, A>,
  <E2>(
    evaluate: LazyArg<Cause.Cause<E2>>,
    duration: Duration.Duration
  ) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R, E | E2, A>
>(3, (restore) =>
  (self, evaluate, duration) =>
    flatten(timeoutTo(
      self,
      failCauseSync(restore(evaluate)),
      succeed,
      duration
    )))

/** @internal */
export const timeoutTo = Debug.untracedDual<
  <R, E, A, B2, B>(
    self: Query.Query<R, E, A>,
    def: B2,
    f: (a: A) => B,
    duration: Duration.Duration
  ) => Query.Query<R, E, B | B2>,
  <B2, A, B>(
    def: B2,
    f: (a: A) => B,
    duration: Duration.Duration
  ) => <R, E>(self: Query.Query<R, E, A>) => Query.Query<R, E, B | B2>
>(4, (restore) =>
  <R, E, A, B2, B>(
    self: Query.Query<R, E, A>,
    def: B2,
    f: (a: A) => B,
    duration: Duration.Duration
  ) => {
    const race = (query: Query.Query<R, E, B | B2>, fiber: Fiber.Fiber<never, B | B2>): Query.Query<R, E, B | B2> =>
      new QueryImpl(
        Effect.raceWith(
          query.step,
          Fiber.join(fiber),
          (leftExit, rightFiber) =>
            Exit.matchEffect(
              leftExit,
              (cause) =>
                Effect.zipRight(
                  Fiber.interrupt(rightFiber),
                  Effect.succeed(Result.fail(cause))
                ),
              (result) => {
                switch (result._tag) {
                  case "Blocked": {
                    switch (result.continue._tag) {
                      case "Eff": {
                        return Effect.succeed(
                          Result.blocked(
                            result.blockedRequests,
                            Continue.eff(race(result.continue.query, fiber))
                          )
                        )
                      }
                      case "Get": {
                        return Effect.succeed(
                          Result.blocked(
                            result.blockedRequests,
                            Continue.eff(race(fromEffect(result.continue.effect), fiber))
                          )
                        )
                      }
                    }
                  }
                  case "Done": {
                    return Effect.zipRight(
                      Fiber.interrupt(rightFiber),
                      Effect.succeed(Result.done(result.value))
                    )
                  }
                  case "Fail": {
                    return Effect.zipRight(
                      Fiber.interrupt(rightFiber),
                      Effect.succeed(Result.fail(result.cause))
                    )
                  }
                }
              }
            ),
          (rightExit, leftFiber) =>
            Effect.zipRight(
              Fiber.interrupt(leftFiber),
              Effect.succeed(Result.fromExit(rightExit))
            )
        )
      )
    return flatMap(
      fromEffect(pipe(
        Effect.sleep(duration),
        Effect.interruptible,
        Effect.as(def),
        Effect.fork
      )),
      (fiber) => race(map(self, restore(f)), fiber)
    )
  })

/** @internal */
export const uncached = Debug.untracedMethod(() =>
  <R, E, A>(self: Query.Query<R, E, A>): Query.Query<R, E, A> =>
    pipe(
      fromEffect(FiberRef.getAndSet(cachingEnabled, false)),
      flatMap((previous) => ensuring(self, fromEffect(FiberRef.set(cachingEnabled, previous))))
    )
)

/** @internal */
export const unit = Debug.untracedMethod(() => (_: void): Query.Query<never, never, void> => succeed(void 0))

/** @internal */
export const unleft = Debug.untracedMethod(() =>
  <R, E, E2, A>(
    self: Query.Query<R, Either.Either<E, E2>, A>
  ): Query.Query<R, E, Either.Either<A, E2>> =>
    matchQuery(
      self,
      Either.match(
        fail,
        (a) => succeed(Either.right(a))
      ),
      (a) => succeed(Either.left(a))
    )
)

/** @internal */
export const unoption = Debug.untracedMethod(() =>
  <R, E, A>(self: Query.Query<R, Option.Option<E>, A>): Query.Query<R, E, Option.Option<A>> =>
    matchQuery(
      self,
      Option.match(
        () => succeed(Option.none()),
        fail
      ),
      (a) => succeed(Option.some(a))
    )
)

/** @internal */
export const unrefine = Debug.untracedDual<
  <R, E, A, E2>(self: Query.Query<R, E, A>, pf: (defect: unknown) => Option.Option<E2>) => Query.Query<R, E | E2, A>,
  <E, E2>(pf: (defect: unknown) => Option.Option<E2>) => <R, A>(self: Query.Query<R, E, A>) => Query.Query<R, E | E2, A>
>(2, (restore) => (self, pf) => unrefineWith(self, restore(pf), identity))

/** @internal */
export const unrefineWith = Debug.untracedDual<
  <R, E, A, E2, E3>(
    self: Query.Query<R, E, A>,
    pf: (defect: unknown) => Option.Option<E2>,
    f: (error: E) => E3
  ) => Query.Query<R, E2 | E3, A>,
  <E, E2, E3>(
    pf: (defect: unknown) => Option.Option<E2>,
    f: (error: E) => E3
  ) => <R, A>(self: Query.Query<R, E, A>) => Query.Query<R, E2 | E3, A>
>(3, (restore) =>
  <R, E, A, E2, E3>(
    self: Query.Query<R, E, A>,
    pf: (defect: unknown) => Option.Option<E2>,
    f: (error: E) => E3
  ) =>
    catchAllCause(self, (cause) =>
      pipe(
        Cause.find(cause, (cause) =>
          Cause.isDieType(cause)
            ? restore(pf)(cause.defect)
            : Option.none()),
        Option.match(
          (): Query.Query<R, E2 | E3, A> => failCause(Cause.map(cause, restore(f))),
          fail
        )
      )))

/** @internal */
export const unright = Debug.untracedMethod(() =>
  <R, E, E2, A>(
    self: Query.Query<R, Either.Either<E, E2>, A>
  ): Query.Query<R, E2, Either.Either<E, A>> =>
    matchQuery(
      self,
      Either.match(
        (a) => succeed(Either.left(a)),
        fail
      ),
      (a) => succeed(Either.right(a))
    )
)

/** @internal */
export const unsandbox = Debug.untracedMethod(() =>
  <R, E, A>(self: Query.Query<R, Cause.Cause<E>, A>): Query.Query<R, E, A> => mapErrorCause(self, Cause.flatten)
)

/** @internal */
export const unwrap = Debug.untracedMethod(() =>
  <R, E, A>(effect: Effect.Effect<R, E, Query.Query<R, E, A>>): Query.Query<R, E, A> => flatten(fromEffect(effect))
)

/** @internal */
export const zip = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E | E2, readonly [A, A2]>,
  <R2, E2, A2>(
    that: Query.Query<R2, E2, A2>
  ) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, readonly [A, A2]>
>(2, () => (self, that) => zipWith(self, that, (a, b) => [a, b] as const))

/** @internal */
export const zipBatched = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E | E2, readonly [A, A2]>,
  <R2, E2, A2>(
    that: Query.Query<R2, E2, A2>
  ) => <R, E, A>(
    self: Query.Query<R, E, A>
  ) => Query.Query<R | R2, E | E2, readonly [A, A2]>
>(2, () => (self, that) => zipWithBatched(self, that, (a, b) => [a, b] as const))

/** @internal */
export const zipBatchedLeft = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E | E2, A>,
  <R2, E2, A2>(
    that: Query.Query<R2, E2, A2>
  ) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, A>
>(2, () => (self, that) => zipWithBatched(self, that, (a, _) => a))

/** @internal */
export const zipBatchedRight = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E | E2, A2>,
  <R2, E2, A2>(
    that: Query.Query<R2, E2, A2>
  ) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, A2>
>(2, () => (self, that) => zipWithBatched(self, that, (_, b) => b))

/** @internal */
export const zipLeft = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E | E2, A>,
  <R2, E2, A2>(
    that: Query.Query<R2, E2, A2>
  ) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, A>
>(2, () => (self, that) => zipWith(self, that, (a, _) => a))

/** @internal */
export const zipRight = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E | E2, A2>,
  <R2, E2, A2>(
    that: Query.Query<R2, E2, A2>
  ) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, A2>
>(2, () => (self, that) => zipWith(self, that, (_, a2) => a2))

/** @internal */
export const zipPar = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E | E2, readonly [A, A2]>,
  <R2, E2, A2>(
    that: Query.Query<R2, E2, A2>
  ) => <R, E, A>(
    self: Query.Query<R, E, A>
  ) => Query.Query<R | R2, E | E2, readonly [A, A2]>
>(2, () => (self, that) => zipWithPar(self, that, (a, b) => [a, b] as const))

/** @internal */
export const zipParLeft = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E | E2, A>,
  <R2, E2, A2>(
    that: Query.Query<R2, E2, A2>
  ) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, A>
>(2, () => (self, that) => zipWithPar(self, that, (a, _) => a))

/** @internal */
export const zipParRight = Debug.untracedDual<
  <R, E, A, R2, E2, A2>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, A2>
  ) => Query.Query<R | R2, E | E2, A2>,
  <R2, E2, A2>(
    that: Query.Query<R2, E2, A2>
  ) => <R, E, A>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, A2>
>(2, () => (self, that) => zipWithPar(self, that, (_, a2) => a2))

/** @internal */
export const zipWith: {
  <R, E, A, R2, E2, B, C>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ): Query.Query<R | R2, E | E2, C>
  <R2, E2, B, A, C>(
    that: Query.Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ): <R, E>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, C>
} = Debug.dualWithTrace<
  <R, E, A, R2, E2, B, C>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ) => Query.Query<R | R2, E | E2, C>,
  <R2, E2, B, A, C>(
    that: Query.Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ) => <R, E>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, C>
>(3, (trace, restore) =>
  (self, that, f) =>
    new QueryImpl(
      Effect.flatMap(self.step, (result) => {
        switch (result._tag) {
          case "Blocked": {
            switch (result.continue._tag) {
              case "Eff": {
                return Effect.succeed(
                  Result.blocked(
                    result.blockedRequests,
                    Continue.eff(zipWith(result.continue.query, that, restore(f)))
                  )
                )
              }
              case "Get": {
                return Effect.map(that.step, (thatResult) => {
                  switch (thatResult._tag) {
                    case "Blocked": {
                      return Result.blocked(
                        BlockedRequests.seq(result.blockedRequests, thatResult.blockedRequests),
                        zipWithContinuation(result.continue, thatResult.continue, restore(f))
                      )
                    }
                    case "Done": {
                      return Result.blocked(
                        result.blockedRequests,
                        mapContinuation(result.continue, (a) => restore(f)(a, thatResult.value))
                      )
                    }
                    case "Fail": {
                      return Result.fail(thatResult.cause)
                    }
                  }
                })
              }
            }
          }
          case "Done": {
            return Effect.map(that.step, (thatResult) => {
              switch (thatResult._tag) {
                case "Blocked": {
                  return Result.blocked(
                    thatResult.blockedRequests,
                    mapContinuation(thatResult.continue, (b) => restore(f)(result.value, b))
                  )
                }
                case "Done": {
                  return Result.done(restore(f)(result.value, thatResult.value))
                }
                case "Fail": {
                  return Result.fail(thatResult.cause)
                }
              }
            })
          }
          case "Fail": {
            return Effect.succeed(Result.fail(result.cause))
          }
        }
      }).traced(trace)
    ))

/** @internal */
export const zipWithBatched = Debug.untracedDual<
  <R, E, A, R2, E2, B, C>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ) => Query.Query<R | R2, E | E2, C>,
  <A, R2, E2, B, C>(
    that: Query.Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ) => <R, E>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, C>
>(3, (restore) =>
  (self, that, f) =>
    new QueryImpl(Effect.zipWith(
      self.step,
      that.step,
      (selfResult, thatResult) => {
        if (Result.isBlocked(selfResult) && Result.isBlocked(thatResult)) {
          return Result.blocked(
            BlockedRequests.par(selfResult.blockedRequests, thatResult.blockedRequests),
            zipWithBatchedContinuation(selfResult.continue, thatResult.continue, restore(f))
          )
        }
        if (Result.isBlocked(selfResult) && Result.isDone(thatResult)) {
          return Result.blocked(
            selfResult.blockedRequests,
            mapContinuation(selfResult.continue, (a) => restore(f)(a, thatResult.value))
          )
        }
        if (Result.isDone(selfResult) && Result.isBlocked(thatResult)) {
          return Result.blocked(
            thatResult.blockedRequests,
            mapContinuation(thatResult.continue, (b) => restore(f)(selfResult.value, b))
          )
        }
        if (Result.isDone(selfResult) && Result.isDone(thatResult)) {
          return Result.done(restore(f)(selfResult.value, thatResult.value))
        }
        if (Result.isFail(selfResult) && Result.isFail(thatResult)) {
          return Result.fail(Cause.parallel(selfResult.cause, thatResult.cause))
        }
        if (Result.isFail(selfResult)) {
          return Result.fail(selfResult.cause)
        }
        if (Result.isFail(thatResult)) {
          return Result.fail(thatResult.cause)
        }
        throw new Error(
          "BUG: BlockedRequests.reduce - please report an issue at https://github.com/Effect-TS/query/issues"
        )
      }
    )))

/** @internal */
export const zipWithPar = Debug.untracedDual<
  <R, E, A, R2, E2, B, C>(
    self: Query.Query<R, E, A>,
    that: Query.Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ) => Query.Query<R | R2, E | E2, C>,
  <A, R2, E2, B, C>(
    that: Query.Query<R2, E2, B>,
    f: (a: A, b: B) => C
  ) => <R, E>(self: Query.Query<R, E, A>) => Query.Query<R | R2, E | E2, C>
>(3, (restore) =>
  (self, that, f) =>
    new QueryImpl(Effect.zipWithPar(
      self.step,
      that.step,
      (selfResult, thatResult) => {
        if (Result.isBlocked(selfResult) && Result.isBlocked(thatResult)) {
          return Result.blocked(
            BlockedRequests.par(selfResult.blockedRequests, thatResult.blockedRequests),
            zipWithParContinuation(selfResult.continue, thatResult.continue, restore(f))
          )
        }
        if (Result.isBlocked(selfResult) && Result.isDone(thatResult)) {
          return Result.blocked(
            selfResult.blockedRequests,
            mapContinuation(selfResult.continue, (a) => restore(f)(a, thatResult.value))
          )
        }
        if (Result.isDone(selfResult) && Result.isBlocked(thatResult)) {
          return Result.blocked(
            thatResult.blockedRequests,
            mapContinuation(thatResult.continue, (b) => restore(f)(selfResult.value, b))
          )
        }
        if (Result.isDone(selfResult) && Result.isDone(thatResult)) {
          return Result.done(restore(f)(selfResult.value, thatResult.value))
        }
        if (Result.isFail(selfResult) && Result.isFail(thatResult)) {
          return Result.fail(Cause.parallel(selfResult.cause, thatResult.cause))
        }
        if (Result.isFail(selfResult)) {
          return Result.fail(selfResult.cause)
        }
        if (Result.isFail(thatResult)) {
          return Result.fail(thatResult.cause)
        }
        throw new Error(
          "BUG: BlockedRequests.reduce - please report an issue at https://github.com/Effect-TS/query/issues"
        )
      }
    )))

// Circular with BlockedRequests

/**
 * Executes all requests, submitting requests to each data source in parallel.
 */
const runBlockedRequests = <R>(self: BlockedRequests.BlockedRequests<R>) => {
  return Effect.flatMap(
    FiberRef.get(currentCache),
    (currentCache) =>
      Effect.forEachDiscard(
        BlockedRequests.flatten(self),
        (requestsByDataSource) =>
          Effect.forEachParDiscard(Sequential.toChunk(requestsByDataSource), ([dataSource, sequential]) =>
            Effect.flatMap(
              dataSource.runAll(Chunk.map(sequential, (blockedRequests) =>
                Chunk.map(blockedRequests, (blockedRequest) => blockedRequest.request))),
              (completedRequests) => {
                const blockedRequests: Chunk.Chunk<BlockedRequest.BlockedRequest<unknown>> = Chunk.flatten(sequential)
                const leftovers = pipe(
                  completedRequestMap.requests(completedRequests),
                  HashSet.difference(Chunk.map(blockedRequests, (blockedRequest) =>
                    blockedRequest.request as Request.Request<unknown, unknown>))
                )
                return pipe(
                  Effect.forEachDiscard(blockedRequests, (blockedRequest) =>
                    Ref.set(
                      blockedRequest.result,
                      completedRequestMap.get(completedRequests, blockedRequest.request)
                    )),
                  Effect.zipRight(
                    Effect.forEachDiscard(leftovers, (request) =>
                      Effect.flatMap(
                        Ref.make(completedRequestMap.get(completedRequests, request)),
                        (ref) =>
                          Cache.set(currentCache, request, ref)
                      ))
                  )
                )
              }
            ))
      )
  )
}

/**
 * Partitions the elements of a collection using the specified function.
 */
const partitionMap = <A, B, C>(f: (a: A) => Either.Either<B, C>) =>
  (self: Chunk.Chunk<A>): readonly [Chunk.Chunk<B>, Chunk.Chunk<C>] => {
    const bs: Array<B> = []
    const cs: Array<C> = []
    for (let i = 0; i < self.length; i++) {
      const a = pipe(self, Chunk.unsafeGet(i))
      const e = f(a)
      if (Either.isLeft(e)) {
        bs.push(e.left)
      } else {
        cs.push(e.right)
      }
    }
    return [Chunk.unsafeFromArray(bs), Chunk.unsafeFromArray(cs)]
  }

// Circular with Continue

/**
 * Collects a collection of continuation into a continuation returning a
 * collection of their results, in parallel.
 */
const collectAllParContinuation = <R, E, A>(
  elements: Iterable<Continue.Continue<R, E, A>>
): Continue.Continue<R, E, Chunk.Chunk<A>> => {
  const queries: Array<readonly [Query.Query<R, E, A>, number]> = []
  const effects: Array<readonly [Effect.Effect<never, E, A>, number]> = []
  const iterator = elements[Symbol.iterator]()
  let index = 0
  let next: IteratorResult<Continue.Continue<R, E, A>, any>
  while ((next = iterator.next()) && !next.done) {
    const element = next.value
    switch (element._tag) {
      case "Eff": {
        queries.push([element.query, index])
        break
      }
      case "Get": {
        effects.push([element.effect, index])
        break
      }
    }
    index += 1
  }
  if (ReadonlyArray.isEmpty(queries)) {
    return Continue.get(Effect.collectAll(effects.map((tuple) => tuple[0])))
  }
  const query = flatMap(
    collectAllPar(queries.map((tuple) => tuple[0])),
    (chunk) => {
      const array = new Array(chunk.length)
      const indices = queries.map((tuple) => tuple[1])
      for (let i = 0; i < chunk.length; i++) {
        array[indices[i]] = pipe(chunk, Chunk.unsafeGet(i))
      }
      return map(
        fromEffect(Effect.collectAll(effects.map((tuple) => tuple[0]))),
        (chunk) => {
          for (let i = 0; i < chunk.length; i++) {
            array[effects[i][1]] = pipe(chunk, Chunk.unsafeGet(i))
          }
          return Chunk.fromIterable(array)
        }
      )
    }
  )
  return Continue.eff(query)
}

/**
 * Purely contramaps over the environment type of this continuation.
 */
const contramapContextContinuation = <R, E, A, R0>(
  self: Continue.Continue<R, E, A>,
  f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
): Continue.Continue<R0, E, A> => {
  switch (self._tag) {
    case "Eff": {
      return Continue.eff(contramapContext(self.query, f))
    }
    case "Get": {
      return self
    }
  }
}

/**
 * Purely maps over the success type of this continuation.
 */
const mapContinuation = <R, E, A, B>(self: Continue.Continue<R, E, A>, f: (a: A) => B): Continue.Continue<R, E, B> => {
  switch (self._tag) {
    case "Eff": {
      return Continue.eff(map(self.query, f))
    }
    case "Get": {
      return Continue.get(Effect.map(self.effect, f))
    }
  }
}

/**
 * Transforms all data sources with the specified data source aspect.
 */
const mapDataSourcesContinuation = <R, E, A, R2>(
  self: Continue.Continue<R, E, A>,
  f: (dataSource: DataSource.DataSource<R, A>) => DataSource.DataSource<R2, A>
): Continue.Continue<R | R2, E, A> => {
  switch (self._tag) {
    case "Eff": {
      return Continue.eff(mapDataSources(self.query, f))
    }
    case "Get": {
      return self
    }
  }
}

/**
 * Purely maps over the failure cause of this continuation.
 */
const mapErrorCauseContinuation = <R, E, A, E2>(
  self: Continue.Continue<R, E, A>,
  f: (e: Cause.Cause<E>) => Cause.Cause<E2>
): Continue.Continue<R, E2, A> => {
  switch (self._tag) {
    case "Eff": {
      return Continue.eff(mapErrorCause(self.query, f))
    }
    case "Get": {
      return Continue.get(Effect.mapErrorCause(self.effect, f))
    }
  }
}

/**
 * Effectually maps over the success type of this continuation.
 */
const mapQueryContinuation = <R, E, A, R2, E2, A2>(
  self: Continue.Continue<R, E, A>,
  f: (a: A) => Query.Query<R2, E2, A2>
): Continue.Continue<R | R2, E | E2, A2> => {
  switch (self._tag) {
    case "Eff": {
      return Continue.eff(flatMap(self.query, f))
    }
    case "Get": {
      return Continue.eff(flatMap(fromEffect(self.effect), f))
    }
  }
}

/**
 * Effectually folds over the failure and success types of this continuation.
 */
const matchCauseQueryContination = <R, E, R2, E2, A2, A, R3, E3, A3>(
  self: Continue.Continue<R, E, A>,
  onFailure: (cause: Cause.Cause<E>) => Query.Query<R2, E2, A2>,
  onSuccess: (value: A) => Query.Query<R3, E3, A3>
): Continue.Continue<R | R2 | R3, E2 | E3, A2 | A3> => {
  switch (self._tag) {
    case "Eff": {
      return Continue.eff(matchCauseQuery(self.query, onFailure, onSuccess))
    }
    case "Get": {
      return Continue.eff(matchCauseQuery(fromEffect(self.effect), onFailure, onSuccess))
    }
  }
}

/**
 * Combines this continuation with that continuation using the specified
 * function, in sequence.
 */
const zipWithContinuation = <R, E, A, R2, E2, B, C>(
  self: Continue.Continue<R, E, A>,
  that: Continue.Continue<R2, E2, B>,
  f: (a: A, b: B) => C
): Continue.Continue<R | R2, E | E2, C> => {
  switch (self._tag) {
    case "Eff": {
      switch (that._tag) {
        case "Eff": {
          return Continue.eff(zipWith(self.query, that.query, f))
        }
        case "Get": {
          return Continue.eff(zipWith(self.query, fromEffect(that.effect), f))
        }
      }
    }
    case "Get": {
      switch (that._tag) {
        case "Eff": {
          return Continue.eff(zipWith(fromEffect(self.effect), that.query, f))
        }
        case "Get": {
          return Continue.get(Effect.zipWith(self.effect, that.effect, f))
        }
      }
    }
  }
}

/**
 * Combines this continuation with that continuation using the specified
 * function, in parallel.
 */
const zipWithParContinuation = <R, E, A, R2, E2, B, C>(
  self: Continue.Continue<R, E, A>,
  that: Continue.Continue<R2, E2, B>,
  f: (a: A, b: B) => C
): Continue.Continue<R | R2, E | E2, C> => {
  switch (self._tag) {
    case "Eff": {
      switch (that._tag) {
        case "Eff": {
          return Continue.eff(zipWithPar(self.query, that.query, f))
        }
        case "Get": {
          return Continue.eff(zipWith(self.query, fromEffect(that.effect), f))
        }
      }
    }
    case "Get": {
      switch (that._tag) {
        case "Eff": {
          return Continue.eff(zipWith(fromEffect(self.effect), that.query, f))
        }
        case "Get": {
          return Continue.get(Effect.zipWith(self.effect, that.effect, f))
        }
      }
    }
  }
}

/**
 * Combines this continuation with that continuation using the specified
 * function, batching requests to data sources.
 */
export const zipWithBatchedContinuation = <R, E, A, R2, E2, B, C>(
  self: Continue.Continue<R, E, A>,
  that: Continue.Continue<R2, E2, B>,
  f: (a: A, b: B) => C
): Continue.Continue<R | R2, E | E2, C> => {
  switch (self._tag) {
    case "Eff": {
      switch (that._tag) {
        case "Eff": {
          return Continue.eff(zipWithBatched(self.query, that.query, f))
        }
        case "Get": {
          return Continue.eff(zipWith(self.query, fromEffect(that.effect), f))
        }
      }
    }
    case "Get": {
      switch (that._tag) {
        case "Eff": {
          return Continue.eff(zipWith(fromEffect(self.effect), that.query, f))
        }
        case "Get": {
          return Continue.get(Effect.zipWith(self.effect, that.effect, f))
        }
      }
    }
  }
}

// Circular with Result

/**
 * Collects a collection of results into a single result. Blocked requests and
 * their continuations will be executed in parallel.
 */
const collectAllParResult = <R, E, A>(
  elements: Iterable<Result.Result<R, E, A>>
): Result.Result<R, E, Chunk.Chunk<A>> => {
  const blocked: Array<readonly [BlockedRequests.BlockedRequests<R>, Continue.Continue<R, E, A>, number]> = []
  const done: Array<readonly [A, number]> = []
  const fail: Array<readonly [Cause.Cause<E>, number]> = []
  const iterator = elements[Symbol.iterator]()
  let index = 0
  let next: IteratorResult<Result.Result<R, E, A>, any>
  while ((next = iterator.next()) && !next.done) {
    const result = next.value
    switch (result._tag) {
      case "Blocked": {
        blocked.push([result.blockedRequests, result.continue, index])
        break
      }
      case "Done": {
        done.push([result.value, index])
        break
      }
      case "Fail": {
        fail.push([result.cause, index])
        break
      }
    }
    index++
  }
  if (ReadonlyArray.isEmpty(blocked) && ReadonlyArray.isEmpty(fail)) {
    return Result.done(Chunk.unsafeFromArray(done.map(([a]) => a)))
  }
  if (ReadonlyArray.isEmpty(fail)) {
    const blockedRequests = blocked.map((tuple) => tuple[0]).reduce(BlockedRequests.par, BlockedRequests.empty)
    const continuation = mapContinuation(
      collectAllParContinuation(blocked.map((tuple) => tuple[1])),
      (chunk) => {
        const array: Array<A> = new Array(chunk.length)
        const indices = blocked.map((tuple) => tuple[2])
        for (let i = 0; i < chunk.length; i++) {
          array[indices[i]] = pipe(chunk, Chunk.unsafeGet(i))
        }
        for (let i = 0; i < done.length; i++) {
          array[done[i][1]] = done[i][0]
        }
        return Chunk.fromIterable(array)
      }
    )
    return Result.blocked(blockedRequests, continuation)
  }
  return Result.fail(fail.map((tuple) => tuple[0]).reduce(Cause.parallel, Cause.empty))
}

/**
 * Provides this result with part of its required environment.
 */
const contramapContextResult = <R0, R, E, A>(
  self: Result.Result<R, E, A>,
  f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
) => {
  switch (self._tag) {
    case "Blocked": {
      return Result.blocked(
        BlockedRequests.contramapContext(self.blockedRequests, f),
        contramapContextContinuation(self.continue, f)
      )
    }
    case "Done":
    case "Fail": {
      return self
    }
  }
}

/**
 * Maps the specified function over the failure cause of this result.
 */
const mapErrorCauseResult = <R, E, A, E2>(
  self: Result.Result<R, E, A>,
  f: (cause: Cause.Cause<E>) => Cause.Cause<E2>
): Result.Result<R, E2, A> => {
  switch (self._tag) {
    case "Blocked": {
      return Result.blocked(
        self.blockedRequests,
        mapErrorCauseContinuation(self.continue, f)
      )
    }
    case "Done": {
      return self
    }
    case "Fail": {
      return Result.fail(f(self.cause))
    }
  }
}

/**
 * Transforms all data sources with the specified data source aspect.
 */
const mapDataSourcesResult = <R, E, A, R2>(
  self: Result.Result<R, E, A>,
  f: (dataSource: DataSource.DataSource<R, A>) => DataSource.DataSource<R2, A>
): Result.Result<R | R2, E, A> => {
  switch (self._tag) {
    case "Blocked": {
      return Result.blocked(
        BlockedRequests.mapDataSources(self.blockedRequests, f),
        mapDataSourcesContinuation(self.continue, f)
      )
    }
    case "Done":
    case "Fail": {
      return self
    }
  }
}

/**
 * Maps the specified function over the successful value of this result.
 */
const mapResult = <R, E, A, B>(self: Result.Result<R, E, A>, f: (a: A) => B): Result.Result<R, E, B> => {
  switch (self._tag) {
    case "Blocked": {
      return Result.blocked(self.blockedRequests, mapContinuation(self.continue, f))
    }
    case "Done": {
      return Result.done(f(self.value))
    }
    case "Fail": {
      return self as Result.Result<R, E, B>
    }
  }
}
