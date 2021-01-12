// port of: https://github.com/zio/zio-query/blob/3f9f4237ca2d879b629163f23fe79045eb29f0b0/zio-query/shared/src/main/scala/zio/query/internal/BlockedRequests.scala
import * as S from "@effect-ts/core/Sync";
import * as DS from "src/DataSource";
import { DataSourceAspect } from "src/DataSourceAspect";
import { BlockedRequest } from "./BlockedRequest";

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
