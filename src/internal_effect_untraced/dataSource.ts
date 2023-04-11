import * as Chunk from "@effect/data/Chunk"
import type * as Context from "@effect/data/Context"
import * as Debug from "@effect/data/Debug"
import * as Either from "@effect/data/Either"
import * as Equal from "@effect/data/Equal"
import { pipe } from "@effect/data/Function"
import * as Hash from "@effect/data/Hash"
import type * as Option from "@effect/data/Option"
import * as Cause from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import type * as CompletedRequestMap from "@effect/query/CompletedRequestMap"
import type * as DataSource from "@effect/query/DataSource"
import * as completedRequestMap from "@effect/query/internal_effect_untraced/completedRequestMap"
import type * as Request from "@effect/query/Request"

/** @internal */
const DataSourceSymbolKey = "@effect/query/DataSource"

/** @internal */
export const DataSourceTypeId: DataSource.DataSourceTypeId = Symbol.for(
  DataSourceSymbolKey
) as DataSource.DataSourceTypeId

const dataSourceVariance = {
  _R: (_: never) => _,
  _A: (_: never) => _
}

class DataSourceImpl<R, A> implements DataSource.DataSource<R, A> {
  readonly [DataSourceTypeId] = dataSourceVariance
  constructor(
    readonly runAll: (
      requests: Chunk.Chunk<Chunk.Chunk<A>>
    ) => Effect.Effect<R, never, CompletedRequestMap.CompletedRequestMap>,
    readonly target?: unknown
  ) {}
  [Hash.symbol](): number {
    return this.target ? Hash.hash(this.target) : Hash.random(this)
  }
  [Equal.symbol](that: unknown): boolean {
    return this.target ?
      isDataSource(that) && Equal.equals(this.target, (that as DataSourceImpl<any, any>).target) :
      this === that
  }
  identified(id: unknown): DataSource.DataSource<R, A> {
    return new DataSourceImpl(this.runAll, id)
  }
}

/** @internal */
export const isDataSource = (u: unknown): u is DataSource.DataSource<unknown, unknown> =>
  typeof u === "object" && u != null && DataSourceTypeId in u

/** @internal */
export const make = Debug.untracedMethod((restore) =>
  <R, A>(
    runAll: (requests: Chunk.Chunk<Chunk.Chunk<A>>) => Effect.Effect<R, never, void>
  ): DataSource.DataSource<Exclude<R, CompletedRequestMap.CompletedRequestMap>, A> =>
    new DataSourceImpl((requests) =>
      Effect.suspend(() => {
        const map = completedRequestMap.empty()
        return Effect.as(
          Effect.provideService(completedRequestMap.CompletedRequestMap, map)(restore(runAll)(requests)),
          map
        )
      })
    )
)

/** @internal */
export const makeBatched = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    run: (requests: Chunk.Chunk<A>) => Effect.Effect<R, never, void>
  ): DataSource.DataSource<Exclude<R, CompletedRequestMap.CompletedRequestMap>, A> =>
    new DataSourceImpl(
      Effect.reduce(completedRequestMap.empty(), (outerMap, requests) => {
        const newRequests = Chunk.filter(requests, (request) => !completedRequestMap.has(outerMap, request))
        if (Chunk.isEmpty(newRequests)) {
          return Effect.succeed(outerMap)
        }
        const innerMap = completedRequestMap.empty()
        return pipe(
          restore(run)(newRequests),
          Effect.provideService(completedRequestMap.CompletedRequestMap, innerMap),
          Effect.map(() => completedRequestMap.combine(outerMap, innerMap))
        )
      })
    )
)

/** @internal */
export const around = Debug.untracedDual<
  <R2, A2, R3, _>(
    before: Effect.Effect<R2, never, A2>,
    after: (a: A2) => Effect.Effect<R3, never, _>
  ) => <R, A>(
    self: DataSource.DataSource<R, A>
  ) => DataSource.DataSource<R | R2 | R3, A>,
  <R, A, R2, A2, R3, _>(
    self: DataSource.DataSource<R, A>,
    before: Effect.Effect<R2, never, A2>,
    after: (a: A2) => Effect.Effect<R3, never, _>
  ) => DataSource.DataSource<R | R2 | R3, A>
>(
  3,
  (restore) =>
    (self, before, after) =>
      new DataSourceImpl(
        (requests) => Effect.acquireUseRelease(before, () => restore(self.runAll)(requests), after),
        Chunk.make("Around", self, before, after)
      )
)

/** @internal */
export const batchN = Debug.untracedDual<
  (n: number) => <R, A>(self: DataSource.DataSource<R, A>) => DataSource.DataSource<R, A>,
  <R, A>(self: DataSource.DataSource<R, A>, n: number) => DataSource.DataSource<R, A>
>(2, (restore) =>
  (self, n) =>
    new DataSourceImpl(
      (requests) => {
        return n < 1
          ? Effect.die(Cause.IllegalArgumentException("DataSource.batchN: n must be at least 1"))
          : restore(self.runAll)(
            Chunk.reduce(
              requests,
              Chunk.empty(),
              (acc, chunk) => Chunk.concat(acc, Chunk.chunksOf(chunk, n))
            )
          )
      },
      Chunk.make("BatchN", self, n)
    ))

/** @internal */
export const contramap = Debug.untracedDual<
  <A extends Request.Request<any, any>, B extends Request.Request<any, any>>(
    f: (_: B) => A
  ) => <R>(self: DataSource.DataSource<R, A>) => DataSource.DataSource<R, B>,
  <R, A extends Request.Request<any, any>, B extends Request.Request<any, any>>(
    self: DataSource.DataSource<R, A>,
    f: (_: B) => A
  ) => DataSource.DataSource<R, B>
>(
  2,
  (restore) =>
    (self, f) =>
      new DataSourceImpl(
        (requests) => restore(self.runAll)(pipe(requests, Chunk.map(Chunk.map(restore(f))))),
        Chunk.make("Contramap", self, f)
      )
)

/** @internal */
export const contramapContext = Debug.untracedDual<
  <R0, R>(
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) => <A extends Request.Request<any, any>>(self: DataSource.DataSource<R, A>) => DataSource.DataSource<R0, A>,
  <R, A extends Request.Request<any, any>, R0>(
    self: DataSource.DataSource<R, A>,
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) => DataSource.DataSource<R0, A>
>(2, (restore) =>
  <R, A extends Request.Request<any, any>, R0>(
    self: DataSource.DataSource<R, A>,
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) =>
    new DataSourceImpl<R0, A>(
      (requests) =>
        Effect.contramapContext(
          restore(self.runAll)(requests),
          (context: Context.Context<R0>) => restore(f)(context)
        ),
      Chunk.make("ContramapContext", self, f)
    ))

/** @internal */
export const contramapEffect = Debug.untracedDual<
  <A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>>(
    f: (_: B) => Effect.Effect<R2, never, A>
  ) => <R>(self: DataSource.DataSource<R, A>) => DataSource.DataSource<R | R2, B>,
  <R, A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>>(
    self: DataSource.DataSource<R, A>,
    f: (_: B) => Effect.Effect<R2, never, A>
  ) => DataSource.DataSource<R | R2, B>
>(2, (restore) =>
  (self, f) =>
    new DataSourceImpl(
      (requests) =>
        Effect.flatMap(
          Effect.forEach(requests, Effect.forEachPar(restore(f))),
          (requests) => restore(self.runAll)(requests)
        ),
      Chunk.make("ContramapEffect", self, f)
    ))

/** @internal */
export const eitherWith = Debug.untracedDual<
  <
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    that: DataSource.DataSource<R2, B>,
    f: (_: C) => Either.Either<A, B>
  ) => <R>(self: DataSource.DataSource<R, A>) => DataSource.DataSource<R | R2, C>,
  <
    R,
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    self: DataSource.DataSource<R, A>,
    that: DataSource.DataSource<R2, B>,
    f: (_: C) => Either.Either<A, B>
  ) => DataSource.DataSource<R | R2, C>
>(
  3,
  (restore) =>
    <
      R,
      A extends Request.Request<any, any>,
      R2,
      B extends Request.Request<any, any>,
      C extends Request.Request<any, any>
    >(
      self: DataSource.DataSource<R, A>,
      that: DataSource.DataSource<R2, B>,
      f: (_: C) => Either.Either<A, B>
    ) =>
      new DataSourceImpl<R | R2, C>(
        (batch) =>
          pipe(
            Effect.forEach(batch, (requests) => {
              const [as, bs] = pipe(
                requests,
                Chunk.partitionMap(restore(f))
              )
              return Effect.zipWithPar(
                restore(self.runAll)(Chunk.of(as)),
                restore(that.runAll)(Chunk.of(bs)),
                (self, that) => completedRequestMap.combine(self, that)
              )
            }),
            Effect.map(Chunk.reduce(
              completedRequestMap.empty(),
              (acc, curr) => completedRequestMap.combine(acc, curr)
            ))
          ),
        Chunk.make("EitherWith", self, that, f)
      )
)

/** @internal */
export const fromFunction = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    f: (request: A) => Request.Request.Success<A>
  ): DataSource.DataSource<never, A> =>
    makeBatched((requests: Chunk.Chunk<A>) =>
      Effect.map(completedRequestMap.CompletedRequestMap, (map) =>
        pipe(
          requests,
          Chunk.forEach((request) =>
            completedRequestMap.set(
              map,
              request,
              // @ts-expect-error
              Either.right(restore(f)(request))
            )
          )
        ))
    ).identified(Chunk.make("FromFunction", f))
)

/** @internal */
export const fromFunctionBatched = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Request.Request.Success<A>>
  ): DataSource.DataSource<never, A> =>
    fromFunctionBatchedEffect((as: Chunk.Chunk<A>) => Effect.succeed(restore(f)(as))).identified(
      Chunk.make("FromFunctionBatched", f)
    )
)

/** @internal */
export const fromFunctionBatchedEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Request.Request.Success<A>>>
  ): DataSource.DataSource<R, A> =>
    makeBatched((requests: Chunk.Chunk<A>) =>
      Effect.flatMap(completedRequestMap.CompletedRequestMap, (map) =>
        pipe(
          Effect.match(
            restore(f)(requests),
            (e): Chunk.Chunk<readonly [A, Either.Either<Request.Request.Error<A>, Request.Request.Success<A>>]> =>
              pipe(requests, Chunk.map((k) => [k, Either.left(e)] as const)),
            (bs): Chunk.Chunk<readonly [A, Either.Either<Request.Request.Error<A>, Request.Request.Success<A>>]> =>
              pipe(requests, Chunk.zip(pipe(bs, Chunk.map(Either.right))))
          ),
          Effect.map(Chunk.forEach(
            ([k, v]) => completedRequestMap.set(map, k, v as any)
          ))
        ))
    ).identified(Chunk.make("FromFunctionBatchedEffect", f))
)

/** @internal */
export const fromFunctionBatchedOption = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Option.Option<Request.Request.Success<A>>>
  ): DataSource.DataSource<never, A> =>
    fromFunctionBatchedOptionEffect((as: Chunk.Chunk<A>) => Effect.succeed(restore(f)(as))).identified(
      Chunk.make("FromFunctionBatchedOption", f)
    )
)

/** @internal */
export const fromFunctionBatchedOptionEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    f: (
      chunk: Chunk.Chunk<A>
    ) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Option.Option<Request.Request.Success<A>>>>
  ): DataSource.DataSource<R, A> =>
    makeBatched(
      (requests: Chunk.Chunk<A>) =>
        Effect.flatMap(completedRequestMap.CompletedRequestMap, (map) =>
          Effect.map(
            Effect.match(
              restore(f)(requests),
              (e): Chunk.Chunk<
                readonly [
                  A,
                  Either.Either<Request.Request.Error<A>, Option.Option<Request.Request.Success<A>>>
                ]
              > => pipe(requests, Chunk.map((k) => [k, Either.left(e)] as const)),
              (bs): Chunk.Chunk<
                readonly [
                  A,
                  Either.Either<Request.Request.Error<A>, Option.Option<Request.Request.Success<A>>>
                ]
              > => pipe(requests, Chunk.zip(pipe(bs, Chunk.map(Either.right))))
            ),
            Chunk.forEach(([k, v]) => completedRequestMap.setOption(map, k, v as any))
          ))
    ).identified(Chunk.make("FromFunctionBatchedOptionEffect", f))
)

/** @internal */
export const fromFunctionBatchedWith = Debug.untracedMethod((restore) =>
  <A extends Request.Request<any, any>>(
    f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Request.Request.Success<A>>,
    g: (value: Request.Request.Success<A>) => Request.Request<never, Request.Request.Success<A>>
  ): DataSource.DataSource<never, A> =>
    fromFunctionBatchedWithEffect(
      (as) => Effect.succeed(restore(f)(as)),
      restore(g)
    ).identified(Chunk.make("FromFunctionBatchedWith", f, g))
)

/** @internal */
export const fromFunctionBatchedWithEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Request.Request.Success<A>>>,
    g: (b: Request.Request.Success<A>) => Request.Request<Request.Request.Error<A>, Request.Request.Success<A>>
  ): DataSource.DataSource<R, A> =>
    makeBatched((requests: Chunk.Chunk<A>) =>
      Effect.flatMap(completedRequestMap.CompletedRequestMap, (map) =>
        Effect.map(
          Effect.match(
            restore(f)(requests),
            (e): Chunk.Chunk<
              readonly [
                Request.Request<Request.Request.Error<A>, Request.Request.Success<A>>,
                Either.Either<Request.Request.Error<A>, Request.Request.Success<A>>
              ]
            > => pipe(requests, Chunk.map((k) => [k, Either.left(e)] as const)),
            (bs): Chunk.Chunk<
              readonly [
                Request.Request<Request.Request.Error<A>, Request.Request.Success<A>>,
                Either.Either<Request.Request.Error<A>, Request.Request.Success<A>>
              ]
            > => pipe(bs, Chunk.map((b) => [restore(g)(b), Either.right(b)] as const))
          ),
          Chunk.forEach(([k, v]) => completedRequestMap.set(map, k, v))
        ))
    ).identified(Chunk.make("FromFunctionBatchedWithEffect", f, g))
)

/** @internal */
export const fromFunctionEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
  ): DataSource.DataSource<R, A> =>
    makeBatched((requests: Chunk.Chunk<A>) =>
      Effect.flatMap(completedRequestMap.CompletedRequestMap, (map) =>
        Effect.map(
          Effect.forEachPar(requests, (a) =>
            Effect.map(
              Effect.either(restore(f)(a)),
              (e) => [a, e] as const
            )),
          Chunk.forEach(([k, v]) => completedRequestMap.set(map, k, v as any))
        ))
    ).identified(Chunk.make("FromFunctionEffect", f))
)

/** @internal */
export const fromFunctionOption = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    f: (a: A) => Option.Option<Request.Request.Success<A>>
  ): DataSource.DataSource<never, A> =>
    fromFunctionOptionEffect((a: A) => Effect.succeed(restore(f)(a))).identified(Chunk.make("FromFunctionOption", f))
)

/** @internal */
export const fromFunctionOptionEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Option.Option<Request.Request.Success<A>>>
  ): DataSource.DataSource<R, A> =>
    makeBatched((requests: Chunk.Chunk<A>) =>
      Effect.flatMap(completedRequestMap.CompletedRequestMap, (map) =>
        Effect.map(
          Effect.forEachPar(
            requests,
            (a) => Effect.map(Effect.either(restore(f)(a)), (e) => [a, e] as const)
          ),
          Chunk.forEach(([k, v]) => completedRequestMap.setOption(map, k, v as any))
        ))
    ).identified(Chunk.make("FromFunctionOptionEffect", f))
)

/** @internal */
export const never = Debug.untracedMethod(() =>
  (_: void): DataSource.DataSource<never, never> => make(() => Effect.never())
)

/** @internal */
export const provideContext = Debug.untracedDual<
  <R>(
    context: Context.Context<R>
  ) => <A extends Request.Request<any, any>>(
    self: DataSource.DataSource<R, A>
  ) => DataSource.DataSource<never, A>,
  <R, A extends Request.Request<any, any>>(
    self: DataSource.DataSource<R, A>,
    context: Context.Context<R>
  ) => DataSource.DataSource<never, A>
>(2, () => (self, context) => contramapContext(self, () => context))

/** @internal */
export const race = Debug.untracedDual<
  <R2, A2 extends Request.Request<any, any>>(
    that: DataSource.DataSource<R2, A2>
  ) => <R, A extends Request.Request<any, any>>(
    self: DataSource.DataSource<R, A>
  ) => DataSource.DataSource<R | R2, A | A2>,
  <R, A extends Request.Request<any, any>, R2, A2 extends Request.Request<any, any>>(
    self: DataSource.DataSource<R, A>,
    that: DataSource.DataSource<R2, A2>
  ) => DataSource.DataSource<R | R2, A | A2>
>(
  2,
  (restore) =>
    <R, A, R2, A2>(self: DataSource.DataSource<R, A>, that: DataSource.DataSource<R2, A2>) =>
      new DataSourceImpl((requests) =>
        Effect.race(
          restore(self.runAll)(requests as Chunk.Chunk<Chunk.Chunk<A>>),
          restore(that.runAll)(requests as Chunk.Chunk<Chunk.Chunk<A2>>)
        )
      )
)
