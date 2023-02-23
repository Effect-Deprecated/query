import * as Chunk from "@effect/data/Chunk"
import { pipe } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import * as Option from "@effect/data/Option"
import type * as DataSource from "@effect/query/DataSource"
import type * as BlockedRequest from "@effect/query/internal_effect_untraced/blockedRequest"

/** @internal */
export const SequentialTypeId: unique symbol = Symbol.for("@effect/query/Sequential")

/** @internal */
export type SequentialTypeId = typeof SequentialTypeId

/**
 * A `Sequential<R>` maintains a mapping from data sources to batches of
 * requests from those data sources that must be executed sequentially.
 *
 * @internal
 */
export interface Sequential<R> extends Sequential.Variance<R> {
  readonly map: HashMap.HashMap<
    DataSource.DataSource<unknown, unknown>,
    Chunk.Chunk<Chunk.Chunk<BlockedRequest.BlockedRequest<unknown>>>
  >
}

/** @internal */
export declare namespace Sequential {
  /** @internal */
  export interface Variance<R> {
    readonly [SequentialTypeId]: {
      readonly _R: (_: never) => R
    }
  }
}

/** @internal */
const sequentialVariance = {
  _R: (_: never) => _
}

class SequentialImpl<R> implements Sequential<R> {
  readonly [SequentialTypeId] = sequentialVariance
  constructor(
    readonly map: HashMap.HashMap<
      DataSource.DataSource<unknown, unknown>,
      Chunk.Chunk<Chunk.Chunk<BlockedRequest.BlockedRequest<unknown>>>
    >
  ) {}
}

/**
 * Constructs a new mapping from data sources to batches of requests from those
 * data sources that must be executed sequentially.
 *
 * @internal
 */
export const make = <R, A>(
  map: HashMap.HashMap<
    DataSource.DataSource<R, A>,
    Chunk.Chunk<Chunk.Chunk<BlockedRequest.BlockedRequest<A>>>
  >
): Sequential<R> => new SequentialImpl(map)

/**
 * Combines this collection of batches of requests that must be executed
 * sequentially with that collection of batches of requests that must be
 * executed sequentially to return a new collection of batches of requests
 * that must be executed sequentially.
 *
 * @internal
 */
export const combine = <R, R2>(
  self: Sequential<R>,
  that: Sequential<R2>
): Sequential<R | R2> =>
  new SequentialImpl(HashMap.reduceWithIndex(that.map, self.map, (map, value, key) =>
    HashMap.set(
      map,
      key,
      pipe(
        HashMap.get(map, key),
        Option.match(
          () => Chunk.empty(),
          Chunk.concat(value)
        )
      )
    )))

/**
 * Returns whether this collection of batches of requests is empty.
 *
 * @internal
 */
export const isEmpty = <R>(self: Sequential<R>): boolean => HashMap.isEmpty(self.map)

/**
 * Returns a collection of the data sources that the batches of requests in
 * this collection are from.
 *
 * @internal
 */
export const keys = <R>(
  self: Sequential<R>
): Chunk.Chunk<DataSource.DataSource<R, unknown>> => Chunk.fromIterable(HashMap.keys(self.map)) as any

/**
 * Converts this collection of batches requests that must be executed
 * sequentially to an `Iterable` containing mappings from data sources to
 * batches of requests from those data sources.
 *
 * @internal
 */
export const toChunk = <R>(
  self: Sequential<R>
): Chunk.Chunk<
  readonly [
    DataSource.DataSource<R, unknown>,
    Chunk.Chunk<Chunk.Chunk<BlockedRequest.BlockedRequest<unknown>>>
  ]
> => Chunk.fromIterable(self.map) as any
