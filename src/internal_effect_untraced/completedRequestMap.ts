import * as Debug from "@effect/io/Debug"
import type * as CompletedRequestMap from "@effect/query/CompletedRequestMap"
import type * as Request from "@effect/query/Request"
import * as Either from "@fp-ts/core/Either"
import { pipe } from "@fp-ts/core/Function"
import * as Option from "@fp-ts/core/Option"
import * as Context from "@fp-ts/data/Context"
import * as HashMap from "@fp-ts/data/HashMap"
import type * as HashSet from "@fp-ts/data/HashSet"
import * as MutableRef from "@fp-ts/data/MutableRef"

/** @internal */
const CompletedRequestMapSymbolKey = "@effect/query/CompletedRequestMap"

/** @internal */
export const CompletedRequestMapTypeId: CompletedRequestMap.CompletedRequestMapTypeId = Symbol.for(
  CompletedRequestMapSymbolKey
) as CompletedRequestMap.CompletedRequestMapTypeId

/** @internal */
class CompletedRequestMapImpl implements CompletedRequestMap.CompletedRequestMap {
  readonly [CompletedRequestMapTypeId]: CompletedRequestMap.CompletedRequestMapTypeId = CompletedRequestMapTypeId
  constructor(
    readonly map: MutableRef.MutableRef<
      HashMap.HashMap<
        Request.Request<unknown, unknown>,
        Either.Either<unknown, unknown>
      >
    >
  ) {}
}

/** @internal */
export const Tag: Context.Tag<CompletedRequestMap.CompletedRequestMap> = Context.Tag()

/** @internal */
export const empty = (): CompletedRequestMap.CompletedRequestMap =>
  new CompletedRequestMapImpl(MutableRef.make(HashMap.empty()))

/** @internal */
export const make = <E, A>(
  request: Request.Request<E, A>,
  result: Either.Either<E, A>
): CompletedRequestMap.CompletedRequestMap =>
  new CompletedRequestMapImpl(MutableRef.make(HashMap.make([request, result])))

/** @internal */
export const combine = Debug.dual<
  (
    self: CompletedRequestMap.CompletedRequestMap,
    that: CompletedRequestMap.CompletedRequestMap
  ) => CompletedRequestMap.CompletedRequestMap,
  (
    that: CompletedRequestMap.CompletedRequestMap
  ) => (
    self: CompletedRequestMap.CompletedRequestMap
  ) => CompletedRequestMap.CompletedRequestMap
>(2, (self, that) => {
  const selfMap = MutableRef.get(self.map)
  const thatMap = MutableRef.get(that.map)
  return new CompletedRequestMapImpl(MutableRef.make(HashMap.union(selfMap, thatMap)))
})

/** @internal */
export const get = Debug.dual<
  <A extends Request.Request<any, any>>(
    self: CompletedRequestMap.CompletedRequestMap,
    request: A
  ) => Option.Option<Request.Request.Result<A>>,
  <A extends Request.Request<any, any>>(
    request: A
  ) => (
    self: CompletedRequestMap.CompletedRequestMap
  ) => Option.Option<Request.Request.Result<A>>
>(2, <A extends Request.Request<any, any>>(
  self: CompletedRequestMap.CompletedRequestMap,
  request: A
) => HashMap.get(MutableRef.get(self.map), request) as any)

/** @internal */
export const has = Debug.dual<
  <A extends Request.Request<any, any>>(self: CompletedRequestMap.CompletedRequestMap, request: A) => boolean,
  <A extends Request.Request<any, any>>(request: A) => (self: CompletedRequestMap.CompletedRequestMap) => boolean
>(2, (self, request) => HashMap.has(MutableRef.get(self.map), request))

/** @internal */
export const requests = (
  self: CompletedRequestMap.CompletedRequestMap
): HashSet.HashSet<Request.Request<unknown, unknown>> => HashMap.keySet(MutableRef.get(self.map))

/** @internal */
export const set = Debug.dual<
  <A extends Request.Request<any, any>>(
    self: CompletedRequestMap.CompletedRequestMap,
    request: A,
    result: Request.Request.Result<A>
  ) => void,
  <A extends Request.Request<any, any>>(
    request: A,
    result: Request.Request.Result<A>
  ) => (self: CompletedRequestMap.CompletedRequestMap) => void
>(
  3,
  (self, request, result) => {
    const map = MutableRef.get(self.map)
    MutableRef.set(
      self.map,
      HashMap.set(
        map,
        request as Request.Request<unknown, unknown>,
        result as Either.Either<unknown, unknown>
      )
    )
  }
)

/** @internal */
export const setOption = Debug.dual<
  <A extends Request.Request<any, any>>(
    self: CompletedRequestMap.CompletedRequestMap,
    request: A,
    result: Request.Request.OptionalResult<A>
  ) => void,
  <A extends Request.Request<any, any>>(
    request: A,
    result: Request.Request.OptionalResult<A>
  ) => (self: CompletedRequestMap.CompletedRequestMap) => void
>(3, (self, request, result) => {
  pipe(
    result,
    Either.match(
      (e) => set(self, request, Either.left(e) as any),
      Option.match(
        () => self,
        (a) => set(self, request, Either.right(a) as any)
      )
    )
  )
})
