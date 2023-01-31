import type * as DataSource from "@effect/query/DataSource"
import type * as BlockedRequest from "@effect/query/internal/blockedRequest"
import * as Sequential from "@effect/query/internal/sequential"
import { pipe } from "@fp-ts/core/Function"
import * as Option from "@fp-ts/core/Option"
import * as Chunk from "@fp-ts/data/Chunk"
import * as HashMap from "@fp-ts/data/HashMap"

/** @internal */
export const ParallelTypeId: unique symbol = Symbol.for("@effect/query/Parallel")

/** @internal */
export type ParallelTypeId = typeof ParallelTypeId

/**
 * A `Parallel<R>` maintains a mapping from data sources to requests from those
 * data sources that can be executed in parallel.
 *
 * @internal
 */
export interface Parallel<R> extends Parallel.Variance<R> {
  readonly map: HashMap.HashMap<
    DataSource.DataSource<unknown, unknown>,
    Chunk.Chunk<BlockedRequest.BlockedRequest<unknown>>
  >
}

/** @internal */
export declare namespace Parallel {
  /** @internal */
  export interface Variance<R> {
    readonly [ParallelTypeId]: {
      readonly _R: (_: never) => R
    }
  }
}

/** @internal */
const parallelVariance = {
  _R: (_: never) => _
}

/** @internal */
class ParallelImpl<R> implements Parallel<R> {
  readonly [ParallelTypeId] = parallelVariance
  constructor(
    readonly map: HashMap.HashMap<
      DataSource.DataSource<unknown, unknown>,
      Chunk.Chunk<BlockedRequest.BlockedRequest<unknown>>
    >
  ) {}
}

/**
 * The empty collection of requests.
 *
 * @internal
 */
export const empty = <R>(): Parallel<R> => new ParallelImpl(HashMap.empty())

/**
 * Constructs a new collection of requests containing a mapping from the
 * specified data source to the specified request.
 *
 * @internal
 */
export const make = <R, A>(
  dataSource: DataSource.DataSource<R, A>,
  blockedRequest: BlockedRequest.BlockedRequest<A>
): Parallel<R> => new ParallelImpl(HashMap.make([dataSource, Chunk.of(blockedRequest)]))

/**
 * Combines this collection of requests that can be executed in parallel with
 * that collection of requests that can be executed in parallel to return a
 * new collection of requests that can be executed in parallel.
 *
 * @internal
 */
export const combine = <R, R2>(
  self: Parallel<R>,
  that: Parallel<R2>
): Parallel<R | R2> =>
  new ParallelImpl(HashMap.reduceWithIndex(self.map, that.map, (map, value, key) =>
    HashMap.set(
      map,
      key,
      pipe(
        HashMap.get(map, key),
        Option.match(() => value, Chunk.concat(value))
      )
    )))

/**
 * Returns `true` if this collection of requests is empty, `false` otherwise.
 *
 * @internal
 */
export const isEmpty = <R>(self: Parallel<R>): boolean => HashMap.isEmpty(self.map)

/**
 * Returns a collection of the data sources that the requests in this
 * collection are from.
 *
 * @internal
 */
export const keys = <R>(
  self: Parallel<R>
): Chunk.Chunk<DataSource.DataSource<R, unknown>> => Chunk.fromIterable(HashMap.keys(self.map)) as any

/**
 * Converts this collection of requests that can be executed in parallel to a
 * batch of requests in a collection of requests that must be executed
 * sequentially.
 *
 * @internal
 */
export const toSequential = <R>(
  self: Parallel<R>
): Sequential.Sequential<R> => Sequential.make(HashMap.map(self.map, Chunk.of) as any)

/**
 * Converts this collection of requests that can be executed in parallel to an
 * `Iterable` containing mappings from data sources to requests from those
 * data sources.
 *
 * @internal
 */
export const toChunk = <R>(
  self: Parallel<R>
): Chunk.Chunk<
  readonly [
    DataSource.DataSource<R, unknown>,
    Chunk.Chunk<BlockedRequest.BlockedRequest<unknown>>
  ]
> => Chunk.fromIterable(self.map) as any
