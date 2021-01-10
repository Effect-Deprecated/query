// port of: https://github.com/zio/zio-query/blob/3f9f4237ca2d879b629163f23fe79045eb29f0b0/zio-query/shared/src/main/scala/zio/query/internal/BlockedRequests.scala
import { DataSource } from "src/DataSource";
import { DataSourceAspect } from "src/DataSourceAspect";
import { Described } from "src/Described";
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
        dataSource: DataSource<R, A>;
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
export function both<R>(
  fb: BlockedRequests<R>
): <R1>(fa: BlockedRequests<R1>) => BlockedRequests<R & R1> {
  return (fa) => new Both(fa, fb as any); // TODO: SHAME!
}

/**
 * Combines this collection of blocked requests with the specified collection
 * of blocked requests, in sequence.
 */
export function then<R>(
  fb: BlockedRequests<R>
): <R1>(fa: BlockedRequests<R1>) => BlockedRequests<R & R1> {
  return (fa) => new Then(fa, fb as any); // TODO: SHAME!
}

/**
 * Transforms all data sources with the specified data source aspect, which
 * can change the environment type of data sources but must preserve the
 * request type of each data source.
 */
export function mapDataSources<R, R1>(
  f: DataSourceAspect<R, R1>
): (fa: BlockedRequests<R>) => BlockedRequests<R1> {
  // TODO: Stack safety
  return (fa) => {
    switch (fa._tag) {
      case "Empty":
        return new Empty();
      case "Both":
        return new Both(
          mapDataSources(f)(fa.left),
          mapDataSources(f)(fa.right)
        );
      case "Then":
        return new Then(
          mapDataSources(f)(fa.left),
          mapDataSources(f)(fa.right)
        );
      case "Single":
        return fa.f(
          (_) =>
            new Single(($) =>
              $({
                dataSource: f(_.dataSource),
                blockedRequest: _.blockedRequest,
              })
            )
        );
    }
  };
}

/**
 * Provides each data source with part of its required environment.
 */
export function provideSome<R, R0>(
  f: Described<(a: R0) => R>
): (fa: BlockedRequests<R>) => BlockedRequests<R0> {
  // TODO: Stack safety
  return (fa) => {
    switch (fa._tag) {
      case "Empty":
        return new Empty();
      case "Both":
        return new Both(provideSome(f)(fa.left), provideSome(f)(fa.right));
      case "Then":
        return new Then(provideSome(f)(fa.left), provideSome(f)(fa.right));
      case "Single":
        return fa.f(
          (_) =>
            new Single(($) =>
              $({
                dataSource: DS.provideSome(f)(_.dataSource),
                blockedRequest: _.blockedRequest,
              })
            )
        );
    }
  };
}
