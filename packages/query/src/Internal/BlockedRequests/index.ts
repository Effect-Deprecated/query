// tracing: off

// port of: https://github.com/zio/zio-query/blob/3f9f4237ca2d879b629163f23fe79045eb29f0b0/zio-query/shared/src/main/scala/zio/query/internal/BlockedRequests.scala
import * as A from "@effect-ts/core/Collections/Immutable/Chunk"
import * as HS from "@effect-ts/core/Collections/Immutable/HashSet"
import * as L from "@effect-ts/core/Collections/Immutable/List"
import * as T from "@effect-ts/core/Effect"
import { _R } from "@effect-ts/core/Effect"
import * as REF from "@effect-ts/core/Effect/Ref"
import type * as E from "@effect-ts/core/Either"
import { pipe, tuple } from "@effect-ts/core/Function"
import * as O from "@effect-ts/core/Option"
import * as St from "@effect-ts/core/Structural"
import * as S from "@effect-ts/core/Sync"

import type { Cache } from "../../Cache"
import * as CRM from "../../CompletedRequestMap"
import * as DS from "../../DataSource"
import type { DataSourceAspect } from "../../DataSourceAspect"
import type { BlockedRequest } from "../BlockedRequest"
import * as PL from "../Parallel"
import * as SQ from "../Sequential"

function scalaTail<A>(a: L.List<A>): L.List<A> {
  return L.size(a) === 0 ? L.empty() : L.tail(a)
}

class Both<R> {
  readonly _tag = "Both";
  readonly [_R]!: (r: R) => void

  constructor(readonly left: BlockedRequests<R>, readonly right: BlockedRequests<R>) {}
}

class Empty<R> {
  readonly _tag = "Empty";
  readonly [_R]!: (r: R) => void
}

class Single<R> {
  readonly _tag = "Single";
  readonly [_R]!: (r: R) => void
  constructor(
    readonly dataSource: DS.DataSource<R, unknown>,
    readonly blockedRequest: BlockedRequest<unknown>
  ) {}
}

class Then<R> {
  readonly _tag = "Then";
  readonly [_R]!: (r: R) => void
  constructor(
    public readonly left: BlockedRequests<R>,
    public readonly right: BlockedRequests<R>
  ) {}
}

/**
 * `BlockedRequests` captures a collection of blocked requests as a data
 * structure. By doing this the library is able to preserve information about
 * which requests must be performed sequentially and which can be performed in
 * parallel, allowing for maximum possible batching and pipelining while
 * preserving ordering guarantees.
 */
export type BlockedRequests<R> = Both<R> | Empty<R> | Single<R> | Then<R>

/**
 * Combines this collection of blocked requests with the specified collection
 * of blocked requests, in parallel.
 */
export function both<R>(that: BlockedRequests<R>) {
  return <R1>(self: BlockedRequests<R1>): BlockedRequests<R & R1> => both_(self, that)
}

export function both_<R1, R>(self: BlockedRequests<R1>, that: BlockedRequests<R>) {
  return new Both<R & R1>(self, that)
}

/**
 * Combines this collection of blocked requests with the specified collection
 * of blocked requests, in sequence.
 */
export function then<R>(that: BlockedRequests<R>) {
  return <R1>(self: BlockedRequests<R1>): BlockedRequests<R & R1> => then_(self, that)
}
export function then_<R1, R>(self: BlockedRequests<R1>, that: BlockedRequests<R>) {
  return new Then<R & R1>(self, that)
}

/**
 * Transforms all data sources with the specified data source aspect, which
 * can change the environment type of data sources but must preserve the
 * request type of each data source.
 */
export function mapDataSources<R1 extends R, R>(
  f: DataSourceAspect<R1>
): (fa: BlockedRequests<R>) => BlockedRequests<R1> {
  return (fa) => S.run(mapDataSourcesSafe(fa, f))
}

/**
 * Transforms all data sources with the specified data source aspect, which
 * can change the environment type of data sources but must preserve the
 * request type of each data source.
 */
export function mapDataSources_<R1, R>(
  fa: BlockedRequests<R>,
  f: DataSourceAspect<R1>
): BlockedRequests<R & R1> {
  return S.run(mapDataSourcesSafe(fa, f))
}

/**
 * Transforms all data sources with the specified data source aspect, which
 * can change the environment type of data sources but must preserve the
 * request type of each data source.
 */
function mapDataSourcesSafe<R1, R>(
  fa: BlockedRequests<R>,
  f: DataSourceAspect<R1>
): S.UIO<BlockedRequests<R & R1>> {
  return S.gen(function* (_) {
    switch (fa._tag) {
      case "Empty":
        return new Empty()
      case "Both":
        return new Both(
          yield* _(mapDataSourcesSafe(fa.left, f)),
          yield* _(mapDataSourcesSafe(fa.right, f))
        )
      case "Then":
        return new Then(
          yield* _(mapDataSourcesSafe(fa.left, f)),
          yield* _(mapDataSourcesSafe(fa.right, f))
        )
      case "Single": {
        return new Single(f(fa.dataSource), fa.blockedRequest)
      }
    }
  })
}

/**
 * Provides each data source with part of its required environment.
 */
export function provideSome<R, R0>(
  description: string,
  f: (a: R0) => R
): (fa: BlockedRequests<R>) => BlockedRequests<R0> {
  return (fa) => S.run(provideSomeSafe(description, f)(fa))
}

/**
 * Provides each data source with part of its required environment.
 */
export function provideSomeSafe<R, R0>(
  description: string,
  f: (a: R0) => R
): (fa: BlockedRequests<R>) => S.UIO<BlockedRequests<R0>> {
  return (fa) =>
    S.gen(function* (_) {
      switch (fa._tag) {
        case "Empty":
          return new Empty()
        case "Both":
          return new Both(
            yield* _(provideSomeSafe(description, f)(fa.left)),
            yield* _(provideSomeSafe(description, f)(fa.right))
          )
        case "Then":
          return new Then(
            yield* _(provideSomeSafe(description, f)(fa.left)),
            yield* _(provideSomeSafe(description, f)(fa.right))
          )
        case "Single": {
          return new Single(
            DS.provideSome(description, f)(fa.dataSource),
            fa.blockedRequest
          )
        }
      }
    })
}

/**
 * The empty collection of blocked requests.
 */
export const empty: BlockedRequests<unknown> = new Empty()
/**
 * Constructs a collection of blocked requests from the specified blocked
 * request and data source.
 */
export function single<R, K>(
  dataSource: DS.DataSource<R, K>,
  blockedRequest: BlockedRequest<K>
): BlockedRequests<R> {
  return new Single(dataSource as DS.DataSource<R, unknown>, blockedRequest)
}

/**
 * Merges a collection of requests that must be executed sequentially with a
 * collection of requests that can be executed in parallel. If the
 * collections are both from the same single data source then the requests
 * can be pipelined while preserving ordering guarantees.
 */
export function merge<R>(
  sequential: L.List<SQ.Sequential<R>>,
  parallel: PL.Parallel<R>
): L.List<SQ.Sequential<R>> {
  if (L.isEmpty(sequential)) return L.of(PL.sequential(parallel))
  if (PL.isEmpty(parallel)) return sequential

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const seqHead = L.unsafeFirst(sequential)!
  const seqHeadKeys = L.from(SQ.keys(seqHead))
  const parKeys = L.from(PL.keys(parallel))

  if (
    L.size(seqHeadKeys) === 1 &&
    L.size(parKeys) === 1 &&
    St.equals(seqHeadKeys, parKeys)
  ) {
    return L.prepend_(scalaTail(sequential), SQ.add_(seqHead, PL.sequential(parallel)))
  }

  return L.concat_(L.of(PL.sequential(parallel)), sequential)
}

/**
 * Flattens a collection of blocked requests into a collection of pipelined
 * and batched requests that can be submitted for execution.
 */
export function flatten<R>(
  blockedRequests: BlockedRequests<R>
): L.List<SQ.Sequential<R>> {
  let current = L.of(blockedRequests)
  let flattened = L.empty<SQ.Sequential<R>>()

  // eslint-disable-next-line no-constant-condition
  while (1) {
    const [parallel, sequential] = L.reduce_(
      current,
      tuple<[PL.Parallel<R>, L.List<BlockedRequests<R>>]>(PL.empty, L.empty()),
      ([parallel, sequential], blockedRequest) => {
        const [par, seq] = step(blockedRequest)
        return tuple(PL.add(parallel)(par), L.concat_(sequential, seq))
      }
    )

    flattened = merge(flattened, parallel)

    if (L.isEmpty(sequential)) return L.reverse(flattened)

    current = sequential
  }

  throw new Error("absurd")
}

class StepFrame<R> {
  constructor(
    readonly blockedRequests: BlockedRequests<R>,
    readonly stack: L.List<BlockedRequests<R>>,
    readonly parallel: PL.Parallel<R>,
    readonly sequential: L.List<BlockedRequests<R>>
  ) {}
}

/**
 * Takes one step in evaluating a collection of blocked requests, returning a
 * collection of blocked requests that can be performed in parallel and a
 * list of blocked requests that must be performed sequentially after those
 * requests.
 */
export function step<R>(
  c: BlockedRequests<R>
): readonly [PL.Parallel<R>, L.List<BlockedRequests<R>>] {
  let current = new StepFrame(c, L.empty(), PL.empty, L.empty())

  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (current.blockedRequests._tag) {
      case "Empty": {
        const head = L.first(current.stack)
        if (O.isSome(head)) {
          current = new StepFrame(
            head.value,
            scalaTail(current.stack),
            current.parallel,
            current.sequential
          )
        } else {
          return tuple(current.parallel, current.sequential)
        }
        break
      }
      case "Both": {
        current = new StepFrame(
          current.blockedRequests.left,
          L.prepend_(current.stack, current.blockedRequests.right),
          current.parallel,
          current.sequential
        )
        break
      }
      case "Single": {
        const head = L.first(current.stack)
        if (O.isSome(head)) {
          current = new StepFrame(
            head.value,
            scalaTail(current.stack),
            PL.add_(
              current.parallel,
              PL.apply(
                current.blockedRequests.dataSource,
                current.blockedRequests.blockedRequest
              )
            ),
            current.sequential
          )
        } else {
          return tuple(
            PL.add_(
              current.parallel,
              PL.apply(
                current.blockedRequests.dataSource,
                current.blockedRequests.blockedRequest
              )
            ),
            current.sequential
          )
        }
        break
      }
      case "Then": {
        const { left, right } = current.blockedRequests
        switch (left._tag) {
          case "Empty": {
            current = new StepFrame(
              right,
              current.stack,
              current.parallel,
              current.sequential
            )
            break
          }
          case "Then": {
            current = new StepFrame(
              then_(left.left, then_(left.right, current.blockedRequests.right)),
              current.stack,
              current.parallel,
              current.sequential
            )
            break
          }
          case "Both": {
            const l = left.left
            const r = left.right
            current = new StepFrame(
              both_(then_(l, right), then_(r, right)),
              current.stack,
              current.parallel,
              current.sequential
            )
            break
          }
          case "Single": {
            current = new StepFrame(
              left,
              current.stack,
              current.parallel,
              L.prepend_(current.sequential, current.blockedRequests.right)
            )
            break
          }
        }
      }
    }
  }

  throw new Error("absurd")
}

/**
 * Executes all requests, submitting requests to each data source in
 * parallel.
 */
export function run(cache: Cache) {
  return <R>(self: BlockedRequests<R>): T.Effect<R, never, void> =>
    T.forEach_(flatten(self), (requestsByDataSource) =>
      T.forEachPar_(SQ.toIterable(requestsByDataSource), ([dataSource, sequential]) =>
        pipe(
          T.do,
          T.bind("completedRequests", () =>
            dataSource.runAll(
              A.map_(A.from(sequential), (_) => A.map_(_, (br) => br.request))
            )
          ),
          T.bind("blockedRequests", () => T.succeed(A.flatten(sequential))),
          T.bind("leftovers", (_) => {
            const arg1 = CRM.requests(_.completedRequests)
            const arg2 = A.map_(_.blockedRequests, (a) => a.request)
            const a = HS.difference_(arg1, arg2)
            return T.succeed(a)
          }),
          T.tap((_) =>
            T.forEach_(_.blockedRequests, (blockedRequest) =>
              REF.set_(
                blockedRequest.result as REF.Ref<O.Option<E.Either<any, any>>>,
                CRM.lookup_(_.completedRequests, blockedRequest.request)
              )
            )
          ),
          T.tap((_) =>
            T.forEach_(_.leftovers, (request) =>
              T.chain_(REF.makeRef(CRM.lookup_(_.completedRequests, request)), (res) =>
                cache.put(request, res)
              )
            )
          ),
          T.chain(() => T.unit)
        )
      )
    )
}
