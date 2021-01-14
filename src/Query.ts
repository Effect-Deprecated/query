// port of: https://github.com/zio/zio-query/blob/5746d54dfbed8e3c35415355b09c8e6a54c49889/zio-query/shared/src/main/scala/zio/query/ZQuery.scala
import * as T from "@effect-ts/core/Effect";
import { QueryContext } from "./internal/QueryContext";
import * as RES from "./internal/Result";
import * as CONT from "./internal/Continue";
import * as C from "@effect-ts/system/Cause";
import * as BRS from "./internal/BlockedRequests";
import * as BR from "./internal/BlockedRequest";
import { identity, pipe, tuple } from "@effect-ts/core/Function";
import * as E from "@effect-ts/core/Common/Either";
import * as O from "@effect-ts/core/Common/Option";
import * as REF from "@effect-ts/core/Effect/Ref";
import { Request } from "./Request";
import { DataSource } from "./DataSource";
import { _A, _E } from "@effect-ts/core/Utils";
import * as CH from "./Cache";
import { DataSourceAspect } from "./DataSourceAspect";

/**
 * A `ZQuery[R, E, A]` is a purely functional description of an effectual query
 * that may contain requests from one or more data sources, requires an
 * environment `R`, and may fail with an `E` or succeed with an `A`.
 *
 * Requests that can be performed in parallel, as expressed by `zipWithPar` and
 * combinators derived from it, will automatically be batched. Requests that
 * must be performed sequentially, as expressed by `zipWith` and combinators
 * derived from it, will automatically be pipelined. This allows for aggressive
 * data source specific optimizations. Requests can also be deduplicated and
 * cached.
 *
 * This allows for writing queries in a high level, compositional style, with
 * confidence that they will automatically be optimized. For example, consider
 * the following query from a user service.
 *
 * {{{
 * val getAllUserIds: ZQuery[Any, Nothing, List[Int]]         = ???
 * def getUserNameById(id: Int): ZQuery[Any, Nothing, String] = ???
 *
 * for {
 *   userIds   <- getAllUserIds
 *   userNames <- ZQuery.foreachPar(userIds)(getUserNameById)
 * } yield userNames
 * }}}
 *
 * This would normally require N + 1 queries, one for `getAllUserIds` and one
 * for each call to `getUserNameById`. In contrast, `ZQuery` will automatically
 * optimize this to two queries, one for `userIds` and one for `userNames`,
 * assuming an implementation of the user service that supports batching.
 *
 * Based on "There is no Fork: an Abstraction for Efficient, Concurrent, and
 * Concise Data Access" by Simon Marlow, Louis Brandy, Jonathan Coens, and Jon
 * Purdy. [[http://simonmar.github.io/bib/papers/haxl-icfp14.pdf]]
 */
export class Query<R, E, A> {
  readonly _tag = "Query";
  readonly _R!: (r: R) => void;
  readonly _E!: () => E;
  readonly _A!: () => A;

  constructor(
    public readonly step: T.Effect<
      readonly [R, QueryContext],
      E,
      RES.Result<R, E, A>
    >
  ) {}
}

/**
 * Returns a query that models execution of this query, followed by passing
 * its result to the specified function that returns a query. Requests
 * composed with `flatMap` or combinators derived from it will be executed
 * sequentially and will not be pipelined, though deduplication and caching of
 * requests may still be applied.
 */
export function chain<R1, E1, A, B>(f: (a: A) => Query<R1, E1, B>) {
  return <R, E>(self: Query<R, E, A>): Query<R & R1, E | E1, B> =>
    chain_(self, f);
}

export function chain_<R, E, R1, E1, A, B>(
  self: Query<R, E, A>,
  f: (a: A) => Query<R1, E1, B>
): Query<R & R1, E | E1, B> {
  return new Query(
    T.chain_(self.step, (r) => {
      switch (r._tag) {
        case "Blocked":
          return T.succeed(
            RES.blocked(r.blockedRequests, pipe(r.cont, CONT.mapM(f)))
          );
        case "Done":
          return f(r.value).step;
        case "Fail":
          return T.succeed(RES.fail(r.cause));
      }
    })
  );
}

/**
 * Returns a query whose failure and success have been lifted into an
 * `Either`. The resulting query cannot fail, because the failure case has
 * been exposed as part of the `Either` success case.
 */
export function either<R, E, A>(
  self: Query<R, E, A>
): Query<R, never, E.Either<E, A>> {
  return pipe(self, fold<E.Either<E, A>, E, A>(E.left, E.right));
}

/**
 * Folds over the failed or successful result of this query to yield a query
 * that does not fail, but succeeds with the value returned by the left or
 * right function passed to `fold`.
 */
export function fold<B, E, A>(failure: (e: E) => B, success: (a: A) => B) {
  return <R>(self: Query<R, E, A>): Query<R, never, B> =>
    fold_(self, failure, success);
}

export function fold_<R, E, A, B>(
  self: Query<R, E, A>,
  failure: (e: E) => B,
  success: (a: A) => B
): Query<R, never, B> {
  return pipe(
    self,
    foldM(
      (e) => succeed(failure(e)),
      (a) => succeed(success(a))
    )
  );
}

/**
 * A more powerful version of `foldM` that allows recovering from any type
 * of failure except interruptions.
 */
export function foldCauseM<E, A, R2, E2, A2, R3, E3, A3>(
  failure: (cause: C.Cause<E>) => Query<R2, E2, A2>,
  success: (a: A) => Query<R3, E3, A3>
) {
  return <R>(self: Query<R, E, A>): Query<R & R2 & R3, E2 | E3, A2 | A3> =>
    foldCauseM_(self, failure, success);
}

export function foldCauseM_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Query<R, E, A>,
  failure: (cause: C.Cause<E>) => Query<R2, E2, A2>,
  success: (a: A) => Query<R3, E3, A3>
): Query<R & R2 & R3, E2 | E3, A2 | A3> {
  return new Query(
    T.foldCauseM_(
      self.step,
      (_) => failure(_).step,
      (_) => {
        switch (_._tag) {
          case "Blocked":
            return T.succeed(
              RES.blocked(
                _.blockedRequests,
                CONT.foldCauseM_(_.cont, failure, success)
              )
            ) as Query<R & R2 & R3, E2 | E3, A2 | A3>["step"];
          case "Done":
            return success(_.value).step;
          case "Fail":
            return failure(_.cause).step;
        }
      }
    )
  );
}

/**
 * Recovers from errors by accepting one query to execute for the case of an
 * error, and one query to execute for the case of success.
 */
export function foldM<E, A, R2, E2, A2, R3, E3, A3>(
  failure: (failure: E) => Query<R2, E2, A2>,
  success: (a: A) => Query<R3, E3, A3>
) {
  return <R>(self: Query<R, E, A>): Query<R & R2 & R3, E2 | E3, A2 | A3> =>
    pipe(
      self,
      foldCauseM((c) => E.fold_(C.failureOrCause(c), failure, halt), success)
    );
}

/**
 * Maps the specified function over the successful result of this query.
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: Query<R, E, A>): Query<R, E, B> =>
    new Query(T.map_(self.step, RES.map(f)));
}

/**
 * Transforms all data sources with the specified data source aspect.
 */
export function mapDataSources<R, R1>(f: DataSourceAspect<R, R1>) {
  return <E, A>(self: Query<R, E, A>): Query<R1, E, A> =>
    // TODO: fix
    // @ts-expect-error
    new Query(T.map_(self.step, RES.mapDataSources(f)));
}
// final def mapDataSources[R1 <: R](f: DataSourceAspect[R1]): ZQuery[R1, E, A] =
//   ZQuery(step.map(_.mapDataSources(f)))

/**
 * Maps the specified function over the failed result of this query.
 */
export function mapError<E, E1>(f: (a: E) => E1) {
  return <R, A>(self: Query<R, E, A>): Query<R, E1, A> =>
    pipe(self, bimap(f, identity));
}
// final def mapError[E1](f: E => E1)(implicit ev: CanFail[E]): ZQuery[R, E1, A] =
//   bimap(f, identity)

/**
 * Returns a query whose failure and success channels have been mapped by the
 * specified pair of functions, `f` and `g`.
 */
export function bimap<E, E1, A, B>(f: (e: E) => E1, g: (a: A) => B) {
  return <R>(self: Query<R, E, A>): Query<R, E1, B> =>
    pipe(
      self,
      foldM(
        (e) => fail(f(e)),
        (a) => succeed(g(a))
      )
    );
}

/**
 * Constructs a query that fails with the specified cause.
 */
export function halt<E>(cause: C.Cause<E>) {
  return new Query(T.succeed(RES.fail(cause)));
}

/**
 * Constructs a query that never completes.
 */
export const never = fromEffect(T.never);

/**
 * Constructs a query that succeds with the empty value.
 */
export const none = fromEffect(T.none);

/**
 *  Constructs a query that succeeds with the specified value.
 */
export function succeed<A>(value: A) {
  return new Query(T.succeed(RES.done(value)));
}

/**
 *  Constructs a query that succeeds with the specified value.
 */
export function fail<E>(value: E) {
  return new Query(T.succeed(RES.fail(C.fail(value))));
}

/**
 * Constructs a query from an effect.
 */
export function fromEffect<R, E, A>(effect: T.Effect<R, E, A>): Query<R, E, A> {
  return new Query(
    T.provideSome_(T.foldCause_(effect, RES.fail, RES.done), (r) => r[0])
  );
}

/**
 * Provides this query with part of its required environment.
 */
export function provideSome<R, R0>(description: string, f: (r: R0) => R) {
  return <E, A>(self: Query<R, E, A>): Query<R0, E, A> =>
    new Query(
      pipe(
        self.step,
        T.map(RES.provideSome(description, f)),
        T.provideSome((r) => tuple(f(r[0]), r[1]))
      )
    );
}

/**
 * Constructs a query from a request and a data source. Queries will die with
 * a `QueryFailure` when run if the data source does not provide results for
 * all requests received. Queries must be constructed with `fromRequest` or
 * one of its variants for optimizations to be applied.
 */
export function fromRequest<A extends Request<any, any>>(request: A) {
  return <R>(dataSource: DataSource<R, A>): Query<R, _E<A>, _A<A>> =>
    new Query(
      T.chain_(
        T.accessM(([r, queryContext]: readonly [R, QueryContext]) =>
          queryContext.cache.lookup(request)
        ),
        E.fold(
          (leftRef) =>
            T.succeed(
              RES.blocked(
                BRS.single(dataSource, BR.of(request, leftRef)),
                CONT.apply(request, dataSource, leftRef)
              )
            ),
          (rightRef) =>
            T.map_(
              REF.get(rightRef),
              O.fold(
                () =>
                  RES.blocked(
                    BRS.empty,
                    CONT.apply(request, dataSource, rightRef)
                  ),
                (b) => RES.fromEither(b)
              )
            )
        )
      )
    );
}

/**
 * Returns an effect that models executing this query with the specified
 * cache.
 */
export function runCache(cache: CH.Cache) {
  return <R, E, A>(self: Query<R, E, A>) =>
    T.chain_(
      T.provideSome_(self.step, (r: R) => tuple(r, { cache })),
      (_) => {
        switch (_._tag) {
          case "Blocked":
            return T.andThen_(
              BRS.run(cache)(_.blockedRequests),
              CONT.runCache(cache)(_.cont)
            );
          case "Done":
            return T.succeed(_.value);
          case "Fail":
            return T.halt(_.cause);
        }
      }
    );
}

/**
 * Returns an effect that models executing this query.
 */
export function run<R, E, A>(query: Query<R, E, A>): T.Effect<R, E, A> {
  return T.map_(runLog(query), ([_, a]) => a);
}

/**
 * Returns an effect that models executing this query, returning the query
 * result along with the cache.
 */
export function runLog<R, E, A>(
  query: Query<R, E, A>
): T.Effect<R, E, readonly [CH.Cache, A]> {
  return T.chain_(CH.empty, (cache) =>
    T.map_(runCache(cache)(query), (a) => tuple(cache, a))
  );
}

// TODO
export declare function foreachPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Query<R, E, B>
): Query<R, E, readonly B[]>;
