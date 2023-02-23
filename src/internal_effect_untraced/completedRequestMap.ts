import * as Context from "@effect/data/Context"
import * as Either from "@effect/data/Either"
import { dual } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import type * as HashSet from "@effect/data/HashSet"
import * as MutableRef from "@effect/data/MutableRef"
import * as Option from "@effect/data/Option"
import type * as CompletedRequestMap from "@effect/query/CompletedRequestMap"
import type * as Request from "@effect/query/Request"

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
export const combine = dual<
  (
    that: CompletedRequestMap.CompletedRequestMap
  ) => (
    self: CompletedRequestMap.CompletedRequestMap
  ) => CompletedRequestMap.CompletedRequestMap,
  (
    self: CompletedRequestMap.CompletedRequestMap,
    that: CompletedRequestMap.CompletedRequestMap
  ) => CompletedRequestMap.CompletedRequestMap
>(2, (self, that) => {
  const selfMap = MutableRef.get(self.map)
  const thatMap = MutableRef.get(that.map)
  return new CompletedRequestMapImpl(MutableRef.make(HashMap.union(selfMap, thatMap)))
})

/** @internal */
export const get = dual<
  <A extends Request.Request<any, any>>(
    request: A
  ) => (
    self: CompletedRequestMap.CompletedRequestMap
  ) => Option.Option<Request.Request.Result<A>>,
  <A extends Request.Request<any, any>>(
    self: CompletedRequestMap.CompletedRequestMap,
    request: A
  ) => Option.Option<Request.Request.Result<A>>
>(2, <A extends Request.Request<any, any>>(
  self: CompletedRequestMap.CompletedRequestMap,
  request: A
) => HashMap.get(MutableRef.get(self.map), request) as any)

/** @internal */
export const has = dual<
  <A extends Request.Request<any, any>>(request: A) => (self: CompletedRequestMap.CompletedRequestMap) => boolean,
  <A extends Request.Request<any, any>>(self: CompletedRequestMap.CompletedRequestMap, request: A) => boolean
>(2, (self, request) => HashMap.has(MutableRef.get(self.map), request))

/** @internal */
export const requests = (
  self: CompletedRequestMap.CompletedRequestMap
): HashSet.HashSet<Request.Request<unknown, unknown>> => HashMap.keySet(MutableRef.get(self.map))

/** @internal */
export const set = dual<
  <A extends Request.Request<any, any>>(
    request: A,
    result: Request.Request.Result<A>
  ) => (self: CompletedRequestMap.CompletedRequestMap) => void,
  <A extends Request.Request<any, any>>(
    self: CompletedRequestMap.CompletedRequestMap,
    request: A,
    result: Request.Request.Result<A>
  ) => void
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
export const setOption = dual<
  <A extends Request.Request<any, any>>(
    request: A,
    result: Request.Request.OptionalResult<A>
  ) => (self: CompletedRequestMap.CompletedRequestMap) => void,
  <A extends Request.Request<any, any>>(
    self: CompletedRequestMap.CompletedRequestMap,
    request: A,
    result: Request.Request.OptionalResult<A>
  ) => void
>(3, (self, request, result) => {
  Either.match(
    result,
    (e) => set(self, request, Either.left(e) as any),
    Option.match(
      () => self,
      (a) => set(self, request, Either.right(a) as any)
    )
  )
})
