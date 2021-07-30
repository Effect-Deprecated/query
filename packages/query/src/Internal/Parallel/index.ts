// ets_tracing: off

import * as A from "@effect-ts/core/Collections/Immutable/Chunk"
import * as HM from "@effect-ts/core/Collections/Immutable/HashMap"
import { _R } from "@effect-ts/core/Effect"
import * as O from "@effect-ts/core/Option"

import type * as DS from "../../DataSource"
import type { BlockedRequest } from "../BlockedRequest"
import type { BlockedRequests } from "../BlockedRequests"
import { Sequential } from "../Sequential"

/**
 * A `Parallel[R]` maintains a mapping from data sources to requests from
 * those data sources that can be executed in parallel.
 */
export class Parallel<R> {
  readonly [_R]!: (r: R) => void
  constructor(
    public readonly map: HM.HashMap<
      DS.DataSource<unknown, unknown>,
      A.Chunk<BlockedRequest<unknown>>
    >
  ) {}
}

/**
 * Combines this collection of requests that can be executed in parallel
 * with that collection of requests that can be executed in parallel to
 * return a new collection of requests that can be executed in parallel.
 */
export function add<R1>(that: Parallel<R1>) {
  return <R>(self: Parallel<R>): Parallel<R & R1> => add_(self, that)
}

export function add_<R, R1>(self: Parallel<R>, that: Parallel<R1>) {
  return new Parallel<R & R1>(
    HM.reduceWithIndex_(self.map, that.map, (map, k, v) =>
      HM.set_(
        map,
        k,
        O.fold_(
          HM.get_(map, k),
          () => v,
          (_) => A.concat_(_, v)
        )
      )
    )
  )
}

/**
 * Returns whether this collection of requests is empty.
 */
export function isEmpty<R>(self: Parallel<R>) {
  return HM.isEmpty(self.map)
}

/**
 * Returns a collection of the data sources that the requests in this
 * collection are from.
 */
export function keys<R>(self: Parallel<R>): Iterable<DS.DataSource<R, unknown>> {
  return HM.keys(self.map)
}

/**
 * Converts this collection of requests that can be executed in parallel to
 * a batch of requests in a collection of requests that must be executed
 * sequentially.
 */
export function sequential<R>(self: Parallel<R>): Sequential<R> {
  return new Sequential(HM.mapWithIndex_(self.map, (_, v) => A.single(v)))
}

/**
 * Converts this collection of requests that can be executed in parallel to
 * an `Iterable` containing mappings from data sources to requests from
 * those data sources.
 */
export function toIterable<R>(
  self: Parallel<R>
): Iterable<
  readonly [DS.DataSource<R, unknown>, A.Chunk<A.Chunk<BlockedRequests<unknown>>>]
> {
  return self.map as any
}

/**
 * The empty collection of requests.
 */
export const empty = new Parallel<unknown>(HM.make())

/**
 * Constructs a new collection of requests containing a mapping from the
 * specified data source to the specified request.
 */
export function apply<R, A>(
  dataSource: DS.DataSource<R, A>,
  blockedRequest: BlockedRequest<A>
): Parallel<R> {
  return new Parallel(
    HM.set_(
      HM.make(),
      dataSource as DS.DataSource<unknown, unknown>,
      A.single(blockedRequest)
    )
  )
}
