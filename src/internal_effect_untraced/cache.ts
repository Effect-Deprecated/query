import * as Either from "@effect/data/Either"
import { constVoid, pipe } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import * as Option from "@effect/data/Option"
import * as Debug from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import * as Ref from "@effect/io/Ref"
import type * as Cache from "@effect/query/Cache"
import type * as Request from "@effect/query/Request"

/** @internal */
const CacheSymbolKey = "@effect/query/Cache"

/** @internal */
export const CacheTypeId: Cache.CacheTypeId = Symbol.for(
  CacheSymbolKey
) as Cache.CacheTypeId

class CacheImpl implements Cache.Cache {
  readonly [CacheTypeId]: Cache.CacheTypeId = CacheTypeId
  constructor(readonly state: Ref.Ref<HashMap.HashMap<unknown, unknown>>) {}
  get<E, A>(request: Request.Request<E, A>): Effect.Effect<never, void, Ref.Ref<Option.Option<Either.Either<E, A>>>> {
    return Debug.bodyWithTrace((trace) =>
      pipe(
        Effect.map(
          Ref.get(this.state),
          (state) => HashMap.get(state, request) as Option.Option<Ref.Ref<Option.Option<Either.Either<E, A>>>>
        ),
        Effect.some,
        Effect.orElseFail(constVoid)
      ).traced(trace)
    )
  }
  lookup<E, A>(
    request: Request.Request<E, A>
  ): Effect.Effect<
    never,
    never,
    Either.Either<
      Ref.Ref<Option.Option<Either.Either<E, A>>>,
      Ref.Ref<Option.Option<Either.Either<E, A>>>
    >
  > {
    type ReturnValue = Either.Either<
      Ref.Ref<Option.Option<Either.Either<E, A>>>,
      Ref.Ref<Option.Option<Either.Either<E, A>>>
    >
    return Debug.bodyWithTrace((trace) =>
      Effect.flatMap(Ref.make(Option.none<Either.Either<E, A>>()), (ref) =>
        Ref.modify(this.state, (state) =>
          pipe(
            HashMap.get(state, request),
            Option.match(
              () => [
                Either.left(ref) as ReturnValue,
                HashMap.set(state, request as unknown, ref as unknown)
              ],
              (ref) => [Either.right(ref) as ReturnValue, state]
            )
          ))).traced(trace)
    )
  }
  set<E, A>(
    request: Request.Request<E, A>,
    result: Ref.Ref<Option.Option<Either.Either<E, A>>>
  ): Effect.Effect<never, never, void> {
    return Debug.bodyWithTrace((trace) =>
      Ref.update(
        this.state,
        HashMap.set(request as unknown, result as unknown)
      ).traced(trace)
    )
  }
  remove<E, A>(request: Request.Request<E, A>): Effect.Effect<never, never, void> {
    return Debug.bodyWithTrace((trace) =>
      Ref.update(
        this.state,
        HashMap.remove(request as unknown)
      ).traced(trace)
    )
  }
}

/** @internal */
export const unsafeMake = (): Cache.Cache => new CacheImpl(Ref.unsafeMake(HashMap.empty()))

/** @internal */
export const empty = Debug.methodWithTrace((trace) =>
  (): Effect.Effect<never, never, Cache.Cache> => Effect.sync(unsafeMake).traced(trace)
)

/** @internal */
export const get = Debug.dualWithTrace<
  <E, A>(
    request: Request.Request<E, A>
  ) => (
    self: Cache.Cache
  ) => Effect.Effect<never, void, Ref.Ref<Option.Option<Either.Either<E, A>>>>,
  <E, A>(
    self: Cache.Cache,
    request: Request.Request<E, A>
  ) => Effect.Effect<never, void, Ref.Ref<Option.Option<Either.Either<E, A>>>>
>(2, (trace) => (self, request) => self.get(request).traced(trace))

/** @internal */
export const lookup = Debug.dualWithTrace<
  <E, A>(
    request: Request.Request<E, A>
  ) => (
    self: Cache.Cache
  ) => Effect.Effect<
    never,
    never,
    Either.Either<
      Ref.Ref<Option.Option<Either.Either<E, A>>>,
      Ref.Ref<Option.Option<Either.Either<E, A>>>
    >
  >,
  <E, A>(
    self: Cache.Cache,
    request: Request.Request<E, A>
  ) => Effect.Effect<
    never,
    never,
    Either.Either<
      Ref.Ref<Option.Option<Either.Either<E, A>>>,
      Ref.Ref<Option.Option<Either.Either<E, A>>>
    >
  >
>(2, (trace) => (self, request) => self.lookup(request).traced(trace))

/** @internal */
export const set = Debug.dualWithTrace<
  <E, A>(
    request: Request.Request<E, A>,
    result: Ref.Ref<Option.Option<Either.Either<E, A>>>
  ) => (
    self: Cache.Cache
  ) => Effect.Effect<never, never, void>,
  <E, A>(
    self: Cache.Cache,
    request: Request.Request<E, A>,
    result: Ref.Ref<Option.Option<Either.Either<E, A>>>
  ) => Effect.Effect<never, never, void>
>(3, (trace) => (self, request, result) => self.set(request, result).traced(trace))

/** @internal */
export const remove = Debug.dualWithTrace<
  <E, A>(
    request: Request.Request<E, A>
  ) => (
    self: Cache.Cache
  ) => Effect.Effect<never, never, void>,
  <E, A>(
    self: Cache.Cache,
    request: Request.Request<E, A>
  ) => Effect.Effect<never, never, void>
>(2, (trace) => (self, request) => self.remove(request).traced(trace))
