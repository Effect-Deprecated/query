import type * as Context from "@effect/data/Context"
import * as Equal from "@effect/data/Equal"
import * as List from "@effect/data/List"
import type * as DataSource from "@effect/query/DataSource"
import type * as Described from "@effect/query/Described"
import type * as BlockedRequest from "@effect/query/internal_effect_untraced/blockedRequest"
import * as _dataSource from "@effect/query/internal_effect_untraced/dataSource"
import * as Parallel from "@effect/query/internal_effect_untraced/parallel"
import * as Sequential from "@effect/query/internal_effect_untraced/sequential"
import * as Either from "@fp-ts/core/Either"

/**
 * `BlockedRequests` captures a collection of blocked requests as a data
 * structure. By doing this the library is able to preserve information about
 * which requests must be performed sequentially and which can be performed in
 * parallel, allowing for maximum possible batching and pipelining while
 * preserving ordering guarantees.
 *
 * @internal
 */
export type BlockedRequests<R> = Empty | Par<R> | Seq<R> | Single<R>

/** @internal */
export declare namespace BlockedRequests {
  /** @internal */
  export interface Reducer<R, Z> {
    readonly emptyCase: () => Z
    readonly parCase: (left: Z, right: Z) => Z
    readonly singleCase: (
      dataSource: DataSource.DataSource<R, unknown>,
      blockedRequest: BlockedRequest.BlockedRequest<unknown>
    ) => Z
    readonly seqCase: (left: Z, right: Z) => Z
  }
}

/** @internal */
export interface Empty {
  readonly _tag: "Empty"
}

/** @internal */
export interface Par<R> {
  readonly _tag: "Par"
  readonly left: BlockedRequests<R>
  readonly right: BlockedRequests<R>
}

/** @internal */
export interface Seq<R> {
  readonly _tag: "Seq"
  readonly left: BlockedRequests<R>
  readonly right: BlockedRequests<R>
}

/** @internal */
export interface Single<R> {
  readonly _tag: "Single"
  readonly dataSource: DataSource.DataSource<R, unknown>
  readonly blockedRequest: BlockedRequest.BlockedRequest<unknown>
}

/** @internal */
export const empty: BlockedRequests<never> = {
  _tag: "Empty"
}

/**
 * Combines this collection of blocked requests with the specified collection
 * of blocked requests, in parallel.
 *
 * @internal
 */
export const par = <R, R2>(
  self: BlockedRequests<R>,
  that: BlockedRequests<R2>
): BlockedRequests<R | R2> => ({
  _tag: "Par",
  left: self,
  right: that
})

/**
 * Combines this collection of blocked requests with the specified collection
 * of blocked requests, in sequence.
 *
 * @internal
 */
export const seq = <R, R2>(
  self: BlockedRequests<R>,
  that: BlockedRequests<R2>
): BlockedRequests<R | R2> => ({
  _tag: "Seq",
  left: self,
  right: that
})

/**
 * Constructs a collection of blocked requests from the specified blocked
 * request and data source.
 *
 * @internal
 */
export const single = <R, A>(
  dataSource: DataSource.DataSource<R, A>,
  blockedRequest: BlockedRequest.BlockedRequest<A>
): BlockedRequests<R> => ({
  _tag: "Single",
  dataSource,
  blockedRequest
})

/** @internal */
export const MapDataSourcesReducer = <R, A, R2>(
  f: (dataSource: DataSource.DataSource<R, A>) => DataSource.DataSource<R2, A>
): BlockedRequests.Reducer<R, BlockedRequests<R | R2>> => ({
  emptyCase: () => empty,
  parCase: (left, right) => par(left, right),
  seqCase: (left, right) => seq(left, right),
  singleCase: (dataSource, blockedRequest) => single(f(dataSource), blockedRequest)
})

/** @internal */
export const ContramapContextReducer = <R0, R>(
  f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
): BlockedRequests.Reducer<R, BlockedRequests<R0>> => ({
  emptyCase: () => empty,
  parCase: (left, right) => par(left, right),
  seqCase: (left, right) => seq(left, right),
  singleCase: (dataSource, blockedRequest) =>
    single(
      _dataSource.contramapContext(dataSource, f),
      blockedRequest
    )
})

type BlockedRequestsCase = ParCase | SeqCase

interface ParCase {
  readonly _tag: "ParCase"
}

interface SeqCase {
  readonly _tag: "SeqCase"
}

/**
 * Transforms all data sources with the specified data source aspect, which
 * can change the environment type of data sources but must preserve the
 * request type of each data source.
 *
 * @internal
 */
export const mapDataSources = <R, A, R2>(
  self: BlockedRequests<R>,
  f: (dataSource: DataSource.DataSource<R, A>) => DataSource.DataSource<R2, A>
): BlockedRequests<R | R2> => reduce(self, MapDataSourcesReducer(f))

/**
 * Provides each data source with part of its required environment.
 *
 * @internal
 */
export const contramapContext = <R0, R>(
  self: BlockedRequests<R>,
  f: Described.Described<(context: Context.Context<R0>) => Context.Context<R>>
): BlockedRequests<R0> => reduce(self, ContramapContextReducer(f))

/**
 * Folds over the cases of this collection of blocked requests with the
 * specified functions.
 *
 * @internal
 */
export const reduce = <R, Z>(
  self: BlockedRequests<R>,
  reducer: BlockedRequests.Reducer<R, Z>
): Z => {
  let input = List.of(self)
  let output = List.empty<Either.Either<BlockedRequestsCase, Z>>()
  while (List.isCons(input)) {
    const current = input.head
    switch (current._tag) {
      case "Empty": {
        output = List.cons(Either.right(reducer.emptyCase()), output)
        input = input.tail
        break
      }
      case "Par": {
        output = List.cons(Either.left({ _tag: "ParCase" }), output)
        input = List.cons(current.left, List.cons(current.right, input.tail))
        break
      }
      case "Seq": {
        output = List.cons(Either.left({ _tag: "SeqCase" }), output)
        input = List.cons(current.left, List.cons(current.right, input.tail))
        break
      }
      case "Single": {
        const result = reducer.singleCase(current.dataSource, current.blockedRequest)
        output = List.cons(Either.right(result), output)
        input = input.tail
        break
      }
    }
  }
  const result = List.reduce(output, List.empty<Z>(), (acc, current) => {
    switch (current._tag) {
      case "Left": {
        const left = List.unsafeHead(acc)
        const right = List.unsafeHead(List.unsafeTail(acc))
        const tail = List.unsafeTail(List.unsafeTail(acc))
        switch (current.left._tag) {
          case "ParCase": {
            return List.cons(reducer.parCase(left, right), tail)
          }
          case "SeqCase": {
            return List.cons(reducer.seqCase(left, right), tail)
          }
        }
      }
      case "Right": {
        return List.cons(current.right, acc)
      }
    }
  })
  if (List.isNil(result)) {
    throw new Error("BUG: BlockedRequests.reduce - please report an issue at https://github.com/Effect-TS/query/issues")
  }
  return result.head
}

/**
 * Flattens a collection of blocked requests into a collection of pipelined
 * and batched requests that can be submitted for execution.
 *
 * @internal
 */
export const flatten = <R>(
  self: BlockedRequests<R>
): List.List<Sequential.Sequential<R>> => {
  let current = List.of(self)
  let updated = List.empty<Sequential.Sequential<R>>()
  // eslint-disable-next-line no-constant-condition
  while (1) {
    const [parallel, sequential] = List.reduce(
      current,
      [Parallel.empty<R>(), List.empty<BlockedRequests<R>>()] as const,
      ([parallel, sequential], blockedRequest) => {
        const [par, seq] = step(blockedRequest)
        return [
          Parallel.combine(parallel, par),
          List.concat(sequential, seq)
        ]
      }
    )
    updated = merge(updated, parallel)
    if (List.isNil(sequential)) {
      return List.reverse(updated)
    }
    current = sequential
  }
  throw new Error(
    "BUG: BlockedRequests.flatten - please report an issue at https://github.com/Effect-TS/query/issues"
  )
}

/**
 * Takes one step in evaluating a collection of blocked requests, returning a
 * collection of blocked requests that can be performed in parallel and a list
 * of blocked requests that must be performed sequentially after those
 * requests.
 */
const step = <R>(
  requests: BlockedRequests<R>
): readonly [Parallel.Parallel<R>, List.List<BlockedRequests<R>>] => {
  let current: BlockedRequests<R> = requests
  let parallel = Parallel.empty<R>()
  let stack = List.empty<BlockedRequests<R>>()
  let sequential = List.empty<BlockedRequests<R>>()
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (current._tag) {
      case "Empty": {
        if (List.isNil(stack)) {
          return [parallel, sequential] as const
        }
        current = stack.head
        stack = stack.tail
        break
      }
      case "Par": {
        stack = List.cons(current.right, stack)
        current = current.left
        break
      }
      case "Seq": {
        const left = current.left
        const right = current.right
        switch (left._tag) {
          case "Empty": {
            current = right
            break
          }
          case "Par": {
            const l = left.left
            const r = left.right
            current = par(seq(l, right), seq(r, right))
            break
          }
          case "Seq": {
            const l = left.left
            const r = left.right
            current = seq(l, seq(r, right))
            break
          }
          case "Single": {
            current = left
            sequential = List.cons(right, sequential)
            break
          }
        }
        break
      }
      case "Single": {
        parallel = Parallel.combine(
          parallel,
          Parallel.make(current.dataSource, current.blockedRequest)
        )
        if (List.isNil(stack)) {
          return [parallel, sequential]
        }
        current = stack.head
        stack = stack.tail
        break
      }
    }
  }
  throw new Error(
    "BUG: BlockedRequests.step - please report an issue at https://github.com/Effect-TS/query/issues"
  )
}

/**
 * Merges a collection of requests that must be executed sequentially with a
 * collection of requests that can be executed in parallel. If the collections
 * are both from the same single data source then the requests can be
 * pipelined while preserving ordering guarantees.
 */
const merge = <R>(
  sequential: List.List<Sequential.Sequential<R>>,
  parallel: Parallel.Parallel<R>
): List.List<Sequential.Sequential<R>> => {
  if (List.isNil(sequential)) {
    return List.of(Parallel.toSequential(parallel))
  }
  if (Parallel.isEmpty(parallel)) {
    return sequential
  }
  const seqHeadKeys = Sequential.keys(sequential.head)
  const parKeys = Parallel.keys(parallel)
  if (
    seqHeadKeys.length === 1 &&
    parKeys.length === 1 &&
    Equal.equals(seqHeadKeys, parKeys)
  ) {
    return List.cons(
      Sequential.combine(sequential.head, Parallel.toSequential(parallel)),
      sequential.tail
    )
  }
  return List.cons(Parallel.toSequential(parallel), sequential)
}
