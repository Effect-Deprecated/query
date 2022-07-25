export const CompletedRequestMapSym = Symbol.for("@effect/query/CompletedRequestMap")
export type CompletedRequestMapSym = typeof CompletedRequestMapSym

/**
 * A `CompletedRequestMap` is a universally quantified mapping from requests
 * of type `Request<E, A>` to results of type `Either<E, A>` for all types `E`
 * and `A`. The guarantee is that for any request of type `Request<E, A>`, if
 * there is a corresponding value in the map, that value is of type
 * `Either<E, A>`. This is used by the library to support data sources that
 * return different result types for different requests while guaranteeing that
 * results will be of the type requested.
 *
 * @tsplus type effect/query/CompletedRequestMap
 * @tsplus companion effect/query/CompletedRequestMap.Ops
 */
export class CompletedRequestMap {
  readonly [CompletedRequestMapSym]: CompletedRequestMapSym = CompletedRequestMapSym
  constructor(readonly map: HashMap<Request<unknown, unknown>, Either<unknown, unknown>>) {}
}

/**
 * @tsplus type effect/query/CompletedRequestMap.Aspects
 */
export interface CompletedRequestMapAspects {}
/**
 * @tsplus static effect/query/CompletedRequestMap.Ops $
 */
export const Aspects: CompletedRequestMapAspects = {}
