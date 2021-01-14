// port of: https://github.com/zio/zio-query/blob/3f9f4237ca2d879b629163f23fe79045eb29f0b0/zio-query/shared/src/main/scala/zio/query/internal/BlockedRequests.scala
import * as S from "@effect-ts/core/Sync";
import * as DS from "../DataSource";
import * as T from "@effect-ts/core/Effect";
import * as A from "@effect-ts/core/Common/Array";
import * as O from "@effect-ts/core/Common/Option";
import * as E from "@effect-ts/core/Common/Either";
import { DataSourceAspect } from "../DataSourceAspect";
import { BlockedRequest } from "./BlockedRequest";
import { Cache } from "../Cache";
import * as SQ from "./Sequential";
import { pipe, tuple } from "@effect-ts/core/Function";
import * as PL from "./Parallel";
import * as HS from "@effect-ts/core/Persistent/HashSet";
import * as REF from "@effect-ts/core/Effect/Ref";
import * as CRM from "../CompletedRequestMap";

function scalaTail<A>(a: A.Array<A>): A.Array<A> {
  return a.length === 0 ? [] : a.slice(1);
}

class Both<R> {
  readonly _tag = "Both";
  readonly _R!: (r: R) => void;

  constructor(
    public readonly left: BlockedRequests<R>,
    public readonly right: BlockedRequests<R>
  ) {}
}

class Empty {
  readonly _tag = "Empty";
  constructor() {}
}

class Single<R> {
  readonly _tag = "Single";
  constructor(
    public readonly f: <X>(
      go: <A>(_: {
        dataSource: DS.DataSource<R, A>;
        blockedRequest: BlockedRequest<A>;
      }) => X
    ) => X
  ) {}
}

class Then<R> {
  readonly _tag = "Then";
  readonly _R!: (r: R) => void;
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
export type BlockedRequests<R> = Both<R> | Empty | Single<R> | Then<R>;

/**
 * Combines this collection of blocked requests with the specified collection
 * of blocked requests, in parallel.
 */
export function both<R>(fb: BlockedRequests<R>) {
  return <R1>(fa: BlockedRequests<R1>): BlockedRequests<R & R1> =>
    new Both<R & R1>(fa, fb);
}

/**
 * Combines this collection of blocked requests with the specified collection
 * of blocked requests, in sequence.
 */
export function then<R>(fb: BlockedRequests<R>) {
  return <R1>(fa: BlockedRequests<R1>): BlockedRequests<R & R1> =>
    new Then<R & R1>(fa, fb);
}

/**
 * Transforms all data sources with the specified data source aspect, which
 * can change the environment type of data sources but must preserve the
 * request type of each data source.
 */
export function mapDataSources<R, R1>(
  f: DataSourceAspect<R, R1>
): (fa: BlockedRequests<R>) => BlockedRequests<R1> {
  return (fa) => S.run(mapDataSourcesSafe(f)(fa));
}

/**
 * Transforms all data sources with the specified data source aspect, which
 * can change the environment type of data sources but must preserve the
 * request type of each data source.
 */
export function mapDataSourcesSafe<R, R1>(
  f: DataSourceAspect<R, R1>
): (fa: BlockedRequests<R>) => S.UIO<BlockedRequests<R1>> {
  return (fa) =>
    S.gen(function* (_) {
      switch (fa._tag) {
        case "Empty":
          return new Empty();
        case "Both":
          return new Both(
            yield* _(mapDataSourcesSafe(f)(fa.left)),
            yield* _(mapDataSourcesSafe(f)(fa.right))
          );
        case "Then":
          return new Then(
            yield* _(mapDataSourcesSafe(f)(fa.left)),
            yield* _(mapDataSourcesSafe(f)(fa.right))
          );
        case "Single":
          return fa.f((_) => {
            const req = {
              dataSource: f(_.dataSource),
              blockedRequest: _.blockedRequest,
            };
            return new Single(($) => $(req));
          });
      }
    });
}

/**
 * Provides each data source with part of its required environment.
 */
export function provideSome<R, R0>(
  description: string,
  f: (a: R0) => R
): (fa: BlockedRequests<R>) => BlockedRequests<R0> {
  return (fa) => S.run(provideSomeSafe(description, f)(fa));
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
          return new Empty();
        case "Both":
          return new Both(
            yield* _(provideSomeSafe(description, f)(fa.left)),
            yield* _(provideSomeSafe(description, f)(fa.right))
          );
        case "Then":
          return new Then(
            yield* _(provideSomeSafe(description, f)(fa.left)),
            yield* _(provideSomeSafe(description, f)(fa.right))
          );
        case "Single":
          return fa.f((_) => {
            const req = {
              dataSource: DS.provideSome(description, f)(_.dataSource),
              blockedRequest: _.blockedRequest,
            };
            return new Single(($) => $(req));
          });
      }
    });
}

/**
 * The empty collection of blocked requests.
 */
export const empty: BlockedRequests<unknown> = new Empty();
/**
 * Constructs a collection of blocked requests from the specified blocked
 * request and data source.
 */
export function single<R, K>(
  dataSource: DS.DataSource<R, K>,
  blockedRequest: BlockedRequest<K>
): BlockedRequests<R> {
  const req = { dataSource, blockedRequest };
  return new Single((_) => _(req));
}

/**
 * Merges a collection of requests that must be executed sequentially with a
 * collection of requests that can be executed in parallel. If the
 * collections are both from the same single data source then the requests
 * can be pipelined while preserving ordering guarantees.
 */
export function merge<R>(
  sequential: A.Array<SQ.Sequential<R>>,
  parallel: PL.Parallel<R>
): A.Array<SQ.Sequential<R>> {
  if (A.isEmpty(sequential)) return [PL.sequential(parallel)];
  if (PL.isEmpty(parallel)) return sequential;
  // TODO: there is one missing case
  /**
   *  else if (sequential.head.keys.size == 1 && parallel.keys.size == 1 && sequential.head.keys == parallel.keys)
   *  (sequential.head ++ parallel.sequential) :: sequential.tail
   */
  return A.concat_([PL.sequential(parallel)], sequential);
}

/**
 * Flattens a collection of blocked requests into a collection of pipelined
 * and batched requests that can be submitted for execution.
 */
export function flatten<R>(
  blockedRequests: BlockedRequests<R>
): A.Array<SQ.Sequential<R>> {
  // TODO: Stack safety
  function loop(
    blockedRequests: A.Array<BlockedRequests<R>>,
    flattened: A.Array<SQ.Sequential<R>>
  ): A.Array<SQ.Sequential<R>> {
    const [parallel, sequential] = A.reduce_(
      blockedRequests,
      tuple<[PL.Parallel<R>, A.Array<BlockedRequests<R>>]>(PL.empty, A.empty),
      ([parallel, sequential], blockedRequest) => {
        const [par, seq] = step(blockedRequest);
        return tuple(PL.combine(parallel)(par), A.concat_(sequential, seq));
      }
    );
    const updated = merge(flattened, parallel);
    if (A.isEmpty(sequential)) return A.reverse(updated);
    return loop(sequential, updated);
  }

  return loop([blockedRequests], []);
}

/**
 * Takes one step in evaluating a collection of blocked requests, returning a
 * collection of blocked requests that can be performed in parallel and a
 * list of blocked requests that must be performed sequentially after those
 * requests.
 */
export function step<R>(
  c: BlockedRequests<R>
): readonly [PL.Parallel<R>, A.Array<BlockedRequests<R>>] {
  // TODO: Stack safety
  function loop(
    blockedRequests: BlockedRequests<R>,
    stack: A.Array<BlockedRequests<R>>,
    parallel: PL.Parallel<R>,
    sequential: A.Array<BlockedRequests<R>>
  ): readonly [PL.Parallel<R>, A.Array<BlockedRequests<R>>] {
    switch (blockedRequests._tag) {
      case "Empty":
        return pipe(
          A.head(stack),
          O.map((head) => loop(head, scalaTail(stack), parallel, sequential)),
          O.getOrElse(() => tuple(parallel, sequential))
        );
      case "Both":
        return loop(
          blockedRequests.left,
          A.concat_([blockedRequests.right], stack),
          parallel,
          sequential
        );
      case "Single":
        return pipe(
          A.head(stack),
          O.map((head) => loop(head, scalaTail(stack), parallel, sequential)),
          O.getOrElse(() => {
            const f = blockedRequests.f((_) =>
              PL.apply(_.dataSource, _.blockedRequest)
            );
            return tuple(PL.combine(parallel)(f), sequential);
          })
        );
      case "Then":
        switch (blockedRequests.left._tag) {
          case "Empty":
            return loop(blockedRequests.right, stack, parallel, sequential);
          case "Then":
            return loop(
              then(blockedRequests.left.left)(
                then(blockedRequests.left.right)(blockedRequests.right)
              ),
              stack,
              parallel,
              sequential
            );
          case "Both":
            return loop(
              both(then(blockedRequests.left.left)(blockedRequests.right))(
                then(blockedRequests.left.right)(blockedRequests.right)
              ),
              stack,
              parallel,
              sequential
            );
          case "Single":
            return loop(
              blockedRequests.left,
              stack,
              parallel,
              A.concat_([blockedRequests.right], sequential)
            );
        }
    }
  }

  return loop(c, A.empty, PL.empty, A.empty);
}

/**
 * Executes all requests, submitting requests to each data source in
 * parallel.
 */
export function run(cache: Cache) {
  return <R>(self: BlockedRequests<R>): T.Effect<R, never, void> =>
    T.foreach_(flatten(self), (requestsByDataSource) =>
      T.foreachPar_(
        SQ.toIterable(requestsByDataSource),
        ([dataSource, sequential]) =>
          pipe(
            T.do,
            T.bind("completedRequests", () =>
              dataSource.runAll(
                A.map_(sequential, (_) =>
                  A.map_(_, (br) => br((d) => d.request))
                )
              )
            ),
            T.bind("blockedRequests", () => T.succeed(A.flatten(sequential))),
            T.bind("leftovers", (_) =>
              T.succeed(
                HS.difference_(
                  CRM.requests(_.completedRequests),
                  A.map_(_.blockedRequests, (a) => a((g) => g.request))
                )
              )
            ),
            T.tap((_) =>
              T.foreach_(_.blockedRequests, (blockedRequest) =>
                REF.set_(
                  blockedRequest(
                    (g) => g.result as REF.Ref<O.Option<E.Either<any, any>>>
                  ),
                  CRM.lookup(blockedRequest((g) => g.request))(
                    _.completedRequests
                  )
                )
              )
            ),
            T.tap((_) =>
              T.foreach_(_.leftovers, (request) =>
                T.chain_(
                  REF.makeRef(CRM.lookup(request)(_.completedRequests)),
                  (res) => cache.put(request, res)
                )
              )
            ),
            T.chain(() => T.unit)
          )
      )
    );
}
