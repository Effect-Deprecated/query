import type { BlockedRequest } from "@effect/query/_internal/BlockedRequest"

export const _R = Symbol.for("@effect/query/_internal/BlockedRequests.R")
export type _R = typeof _R

/**
 * `BlockedRequests` captures a collection of blocked requests as a data
 * structure. By doing this the library is able to preserve information about
 * which requests must be performed sequentially and which can be performed in
 * parallel, allowing for maximum possible batching and pipelining while
 * preserving ordering guarantees.
 *
 * @tsplus type effect/query/BlockedRequests
 */
export type BlockedRequests<R> = Par<R> | Empty<R> | Single<R> | Seq<R>

/**
 * @tsplus type effect/query/BlockedRequests.Ops
 */
export interface BlockedRequestsOps {
  readonly $: BlockedRequestsAspects
}
export const BlockedRequests: BlockedRequestsOps = {
  $: {}
}

/**
 * @tsplus type effect/query/BlockedRequests.Aspects
 */
export interface BlockedRequestsAspects {}

export class Par<R> {
  readonly _tag = "Par"
  readonly [_R]!: () => R
  constructor(readonly left: BlockedRequests<R>, readonly right: BlockedRequests<R>) {}
}

export class Empty<R> {
  readonly _tag = "Empty"
  readonly [_R]!: () => R
}

export class Single<R> {
  readonly _tag = "Single"
  readonly [_R]!: () => R
  constructor(
    readonly dataSource: DataSource<R, unknown>,
    readonly blockedRequest: BlockedRequest<unknown>
  ) {}
}

export class Seq<R> {
  readonly _tag = "Seq"
  readonly [_R]!: () => R
  constructor(
    public readonly left: BlockedRequests<R>,
    public readonly right: BlockedRequests<R>
  ) {}
}

/**
 * The empty collection of blocked requests.
 *
 * @tsplus static effect/query/BlockedRequests.Ops empty
 */
export const empty: BlockedRequests<never> = new Empty()

/**
 * Constructs a collection of blocked requests from the specified blocked
 * request and data source.
 *
 * @tsplus static effect/query/BlockedRequests.Ops single
 */
export function single<R, K>(
  dataSource: DataSource<R, K>,
  blockedRequest: BlockedRequest<K>
): BlockedRequests<R> {
  return new Single(dataSource as DataSource<R, unknown>, blockedRequest)
}

/**
 * Combines this collection of blocked requests with the specified collection
 * of blocked requests, in parallel.
 *
 * @tsplus pipeable-operator effect/query/BlockedRequests &&
 * @tsplus static effect/query/BlockedRequests.Aspects combinePar
 * @tsplus pipeable effect/query/BlockedRequests combinePar
 */
export function combinePar<R2>(that: BlockedRequests<R2>) {
  return <R>(self: BlockedRequests<R>): BlockedRequests<R | R2> => new Par<R | R2>(self, that)
}

/**
 * Combines this collection of blocked requests with the specified collection
 * of blocked requests, in sequence.
 *
 * @tsplus pipeable-operator effect/query/BlockedRequests +
 * @tsplus static effect/query/BlockedRequests.Aspects combineSeq
 * @tsplus pipeable effect/query/BlockedRequests combineSeq
 */
export function combineSeq<R2>(that: BlockedRequests<R2>) {
  return <R>(self: BlockedRequests<R>): BlockedRequests<R | R2> => new Seq<R | R2>(self, that)
}
