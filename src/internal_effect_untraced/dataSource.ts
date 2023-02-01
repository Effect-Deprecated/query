import * as Cause from "@effect/io/Cause"
import * as Debug from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type * as CompletedRequestMap from "@effect/query/CompletedRequestMap"
import type * as DataSource from "@effect/query/DataSource"
import type * as Described from "@effect/query/Described"
import * as completedRequestMap from "@effect/query/internal_effect_untraced/completedRequestMap"
import * as described from "@effect/query/internal_effect_untraced/described"
import type * as Request from "@effect/query/Request"
import * as Either from "@fp-ts/core/Either"
import { pipe } from "@fp-ts/core/Function"
import type * as Option from "@fp-ts/core/Option"
import * as Chunk from "@fp-ts/data/Chunk"
import type * as Context from "@fp-ts/data/Context"
import * as Equal from "@fp-ts/data/Equal"
import * as Hash from "@fp-ts/data/Hash"

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
    readonly identifier: string,
    readonly runAll: (
      requests: Chunk.Chunk<Chunk.Chunk<A>>
    ) => Effect.Effect<R, never, CompletedRequestMap.CompletedRequestMap>
  ) {}
  [Hash.symbol](): number {
    return Hash.string(this.identifier)
  }
  [Equal.symbol](that: unknown): boolean {
    return isDataSource(that) && this.identifier === that.identifier
  }
}

/** @internal */
export const isDataSource = (u: unknown): u is DataSource.DataSource<unknown, unknown> =>
  typeof u === "object" && u != null && DataSourceTypeId in u

/** @internal */
export const make = Debug.untracedMethod((restore) =>
  <R, A>(
    identifier: string,
    runAll: (requests: Chunk.Chunk<Chunk.Chunk<A>>) => Effect.Effect<R, never, void>
  ): DataSource.DataSource<Exclude<R, CompletedRequestMap.CompletedRequestMap>, A> =>
    new DataSourceImpl(identifier, (requests) =>
      Effect.suspendSucceed(() => {
        const map = completedRequestMap.empty()
        return Effect.as(Effect.provideService(completedRequestMap.Tag, map)(restore(runAll)(requests)), map)
      }))
)

/** @internal */
export const makeBatched = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    identifier: string,
    run: (requests: Chunk.Chunk<A>) => Effect.Effect<R, never, void>
  ): DataSource.DataSource<Exclude<R, CompletedRequestMap.CompletedRequestMap>, A> =>
    new DataSourceImpl(
      identifier,
      Effect.reduce(completedRequestMap.empty(), (outerMap, requests) => {
        const newRequests = Chunk.filter(requests, (request) => !completedRequestMap.has(outerMap, request))
        if (Chunk.isEmpty(newRequests)) {
          return Effect.succeed(outerMap)
        }
        const innerMap = completedRequestMap.empty()
        return pipe(
          restore(run)(newRequests),
          Effect.provideService(completedRequestMap.Tag, innerMap),
          Effect.map(() => completedRequestMap.combine(outerMap, innerMap))
        )
      })
    )
)

/** @internal */
export const around = Debug.untracedDual<
  <R, A, R2, A2, R3, _>(
    self: DataSource.DataSource<R, A>,
    before: Described.Described<Effect.Effect<R2, never, A2>>,
    after: Described.Described<(a: A2) => Effect.Effect<R3, never, _>>
  ) => DataSource.DataSource<R | R2 | R3, A>,
  <R2, A2, R3, _>(
    before: Described.Described<Effect.Effect<R2, never, A2>>,
    after: Described.Described<(a: A2) => Effect.Effect<R3, never, _>>
  ) => <R, A>(
    self: DataSource.DataSource<R, A>
  ) => DataSource.DataSource<R | R2 | R3, A>
>(3, (restore) =>
  (self, before, after) =>
    new DataSourceImpl(
      `${self.identifier}.around(${before.description}, ${after.description})`,
      (requests) =>
        Effect.acquireUseRelease(
          before.value,
          () => restore(self.runAll)(requests),
          after.value
        )
    ))

/** @internal */
export const batchN = Debug.untracedDual<
  <R, A>(self: DataSource.DataSource<R, A>, n: number) => DataSource.DataSource<R, A>,
  (n: number) => <R, A>(self: DataSource.DataSource<R, A>) => DataSource.DataSource<R, A>
>(2, (restore) =>
  (self, n) =>
    new DataSourceImpl(
      `${self.identifier}.batchN(${n})`,
      (requests) =>
        n < 1
          ? Effect.die(Cause.IllegalArgumentException("DataSource.batchN: n must be at least 1"))
          : restore(self.runAll)(
            Chunk.reduce(
              requests,
              Chunk.empty(),
              (acc, chunk) => Chunk.concat(acc, Chunk.chunksOf(chunk, n))
            )
          )
    ))

/** @internal */
export const contramap = Debug.untracedDual<
  <R, A extends Request.Request<any, any>, B extends Request.Request<any, any>>(
    self: DataSource.DataSource<R, A>,
    f: Described.Described<(_: B) => A>
  ) => DataSource.DataSource<R, B>,
  <A extends Request.Request<any, any>, B extends Request.Request<any, any>>(
    f: Described.Described<(_: B) => A>
  ) => <R>(self: DataSource.DataSource<R, A>) => DataSource.DataSource<R, B>
>(2, (restore) =>
  (self, f) =>
    new DataSourceImpl(
      `${self.identifier}.contramap(${f.description})`,
      (requests) => restore(self.runAll)(pipe(requests, Chunk.map(Chunk.map(restore(f.value)))))
    ))

/** @internal */
export const contramapContext = Debug.untracedDual<
  <R, A extends Request.Request<any, any>, R0>(
    self: DataSource.DataSource<R, A>,
    f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
  ) => DataSource.DataSource<R0, A>,
  <R0, R>(
    f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
  ) => <A extends Request.Request<any, any>>(self: DataSource.DataSource<R, A>) => DataSource.DataSource<R0, A>
>(2, (restore) =>
  <R, A extends Request.Request<any, any>, R0>(
    self: DataSource.DataSource<R, A>,
    f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
  ) =>
    new DataSourceImpl<R0, A>(
      `${self.identifier}.contramapContext(${f.description})`,
      (requests) =>
        Effect.contramapContext(
          restore(self.runAll)(requests),
          (context: Context.Context<R0>) => restore(f.value)(context)
        )
    ))

/** @internal */
export const contramapEffect = Debug.untracedDual<
  <R, A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>>(
    self: DataSource.DataSource<R, A>,
    f: Described.Described<(_: B) => Effect.Effect<R2, never, A>>
  ) => DataSource.DataSource<R | R2, B>,
  <A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>>(
    f: Described.Described<(_: B) => Effect.Effect<R2, never, A>>
  ) => <R>(self: DataSource.DataSource<R, A>) => DataSource.DataSource<R | R2, B>
>(2, (restore) =>
  (self, f) =>
    new DataSourceImpl(
      `${self.identifier}.contramapEffect(${f.description})`,
      (requests) =>
        Effect.flatMap(
          Effect.forEach(requests, Effect.forEachPar(restore(f.value))),
          (requests) => restore(self.runAll)(requests)
        )
    ))

/** @internal */
export const eitherWith = Debug.untracedDual<
  <
    R,
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    self: DataSource.DataSource<R, A>,
    that: DataSource.DataSource<R2, B>,
    f: Described.Described<(_: C) => Either.Either<A, B>>
  ) => DataSource.DataSource<R | R2, C>,
  <
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    that: DataSource.DataSource<R2, B>,
    f: Described.Described<(_: C) => Either.Either<A, B>>
  ) => <R>(self: DataSource.DataSource<R, A>) => DataSource.DataSource<R | R2, C>
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
      f: Described.Described<(_: C) => Either.Either<A, B>>
    ) =>
      new DataSourceImpl<R | R2, C>(
        `${self.identifier}.eitherWith(${that.identifier})(${f.description})`,
        (batch) =>
          pipe(
            Effect.forEach(batch, (requests) => {
              const [as, bs] = pipe(
                requests,
                Chunk.partitionMap(restore(f.value))
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
          )
      )
)

/** @internal */
export const fromFunction = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    name: string,
    f: (request: A) => Request.Request.Success<A>
  ): DataSource.DataSource<never, A> =>
    makeBatched(name, (requests) =>
      Effect.serviceWith(completedRequestMap.Tag, (map) =>
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
        )))
)

/** @internal */
export const fromFunctionBatched = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    name: string,
    f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Request.Request.Success<A>>
  ): DataSource.DataSource<never, A> => fromFunctionBatchedEffect(name, (as) => Effect.succeed(restore(f)(as)))
)

/** @internal */
export const fromFunctionBatchedEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    name: string,
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Request.Request.Success<A>>>
  ): DataSource.DataSource<R, A> =>
    makeBatched(name, (requests) =>
      Effect.serviceWith(completedRequestMap.Tag, (map) =>
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
        )))
)

/** @internal */
export const fromFunctionBatchedOption = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    name: string,
    f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Option.Option<Request.Request.Success<A>>>
  ): DataSource.DataSource<never, A> => fromFunctionBatchedOptionEffect(name, (as) => Effect.succeed(restore(f)(as)))
)

/** @internal */
export const fromFunctionBatchedOptionEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    name: string,
    f: (
      chunk: Chunk.Chunk<A>
    ) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Option.Option<Request.Request.Success<A>>>>
  ): DataSource.DataSource<R, A> =>
    makeBatched(
      name,
      (requests) =>
        Effect.serviceWithEffect(completedRequestMap.Tag, (map) =>
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
    )
)

/** @internal */
export const fromFunctionBatchedWith = Debug.untracedMethod((restore) =>
  <A extends Request.Request<any, any>>(
    name: string,
    f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<Request.Request.Success<A>>,
    g: (value: Request.Request.Success<A>) => Request.Request<never, Request.Request.Success<A>>
  ): DataSource.DataSource<never, A> =>
    fromFunctionBatchedWithEffect(
      name,
      (as) => Effect.succeed(restore(f)(as)),
      restore(g)
    )
)

/** @internal */
export const fromFunctionBatchedWithEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    name: string,
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R, Request.Request.Error<A>, Chunk.Chunk<Request.Request.Success<A>>>,
    g: (b: Request.Request.Success<A>) => Request.Request<Request.Request.Error<A>, Request.Request.Success<A>>
  ): DataSource.DataSource<R, A> =>
    makeBatched(name, (requests) =>
      Effect.serviceWithEffect(completedRequestMap.Tag, (map) =>
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
        )))
)

/** @internal */
export const fromFunctionEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    name: string,
    f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
  ): DataSource.DataSource<R, A> =>
    makeBatched(name, (requests) =>
      Effect.serviceWithEffect(completedRequestMap.Tag, (map) =>
        Effect.map(
          Effect.forEachPar(requests, (a) =>
            Effect.map(
              Effect.either(restore(f)(a)),
              (e) => [a, e] as const
            )),
          Chunk.forEach(([k, v]) => completedRequestMap.set(map, k, v as any))
        )))
)

/** @internal */
export const fromFunctionOption = Debug.untracedMethod((restore) =>
  <A extends Request.Request<never, any>>(
    name: string,
    f: (a: A) => Option.Option<Request.Request.Success<A>>
  ): DataSource.DataSource<never, A> => fromFunctionOptionEffect(name, (a) => Effect.succeed(restore(f)(a)))
)

/** @internal */
export const fromFunctionOptionEffect = Debug.untracedMethod((restore) =>
  <R, A extends Request.Request<any, any>>(
    name: string,
    f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Option.Option<Request.Request.Success<A>>>
  ): DataSource.DataSource<R, A> =>
    makeBatched(name, (requests) =>
      Effect.serviceWithEffect(completedRequestMap.Tag, (map) =>
        Effect.map(
          Effect.forEachPar(
            requests,
            (a) => Effect.map(Effect.either(restore(f)(a)), (e) => [a, e] as const)
          ),
          Chunk.forEach(([k, v]) => completedRequestMap.setOption(map, k, v as any))
        )))
)

/** @internal */
export const never = Debug.untracedMethod(() =>
  (_: void): DataSource.DataSource<never, never> => make("never", () => Effect.never())
)

/** @internal */
export const provideContext = Debug.untracedDual<
  <R, A extends Request.Request<any, any>>(
    self: DataSource.DataSource<R, A>,
    context: Described.Described<Context.Context<R>>
  ) => DataSource.DataSource<never, A>,
  <R>(
    context: Described.Described<Context.Context<R>>
  ) => <A extends Request.Request<any, any>>(
    self: DataSource.DataSource<R, A>
  ) => DataSource.DataSource<never, A>
>(2, () =>
  (self, context) =>
    contramapContext(
      self,
      described.make(() => context.value, context.description)
    ))

/** @internal */
export const race = Debug.untracedDual<
  <R, A extends Request.Request<any, any>, R2, A2 extends Request.Request<any, any>>(
    self: DataSource.DataSource<R, A>,
    that: DataSource.DataSource<R2, A2>
  ) => DataSource.DataSource<R | R2, A | A2>,
  <R2, A2 extends Request.Request<any, any>>(
    that: DataSource.DataSource<R2, A2>
  ) => <R, A extends Request.Request<any, any>>(
    self: DataSource.DataSource<R, A>
  ) => DataSource.DataSource<R | R2, A | A2>
>(
  2,
  (restore) =>
    <R, A, R2, A2>(self: DataSource.DataSource<R, A>, that: DataSource.DataSource<R2, A2>) =>
      new DataSourceImpl(`${self.identifier}.race(${that.identifier})`, (requests) =>
        Effect.race(
          restore(self.runAll)(requests as Chunk.Chunk<Chunk.Chunk<A>>),
          restore(that.runAll)(requests as Chunk.Chunk<Chunk.Chunk<A2>>)
        ))
)
