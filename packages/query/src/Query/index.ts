import "@effect-ts/system/Operator"

// port of: https://github.com/zio/zio-query/blob/5746d54dfbed8e3c35415355b09c8e6a54c49889/zio-query/shared/src/main/scala/zio/query/ZQuery.scala
import * as A from "@effect-ts/core/Array"
import * as T from "@effect-ts/core/Effect"
import * as REF from "@effect-ts/core/Effect/Ref"
import * as E from "@effect-ts/core/Either"
import { identity, pipe, tuple } from "@effect-ts/core/Function"
import type { Has } from "@effect-ts/core/Has"
import * as O from "@effect-ts/core/Option"
import type { _A, _E } from "@effect-ts/core/Utils"
import * as C from "@effect-ts/system/Cause"
import * as CL from "@effect-ts/system/Clock"

import * as CH from "../Cache"
import type { DataSource } from "../DataSource"
import type { DataSourceAspect } from "../DataSourceAspect"
import * as BR from "../Internal/BlockedRequest"
import * as BRS from "../Internal/BlockedRequests"
import * as CONT from "../Internal/Continue"
import type { QueryContext } from "../Internal/QueryContext"
import * as RES from "../Internal/Result"
import { QueryFailure } from "../QueryFailure"
import type { Request } from "../Request"

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
 *   userNames <- ZQuery.forEachPar(userIds)(getUserNameById)
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
  readonly _tag = "Query"
  readonly _R!: (r: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(
    public readonly step: T.Effect<readonly [R, QueryContext], E, RES.Result<R, E, A>>
  ) {}
}

/**
 * Returns a query that models execution of this query, followed by passing
 * its result to the specified function that returns a query. Requests
 * composed with `flatMap` or combinators derived from it will be executed
 * sequentially and will not be pipelined, though deduplication and caching of
 * requests may still be applied.
 */
export function chain_<R, E, R1, E1, A, B>(
  self: Query<R, E, A>,
  f: (a: A) => Query<R1, E1, B>
): Query<R & R1, E | E1, B> {
  return new Query(
    T.chain_(self.step, (r) => {
      switch (r._tag) {
        case "Blocked":
          return T.succeed(RES.blocked(r.blockedRequests, pipe(r.cont, CONT.mapM(f))))
        case "Done":
          return f(r.value).step
        case "Fail":
          return T.succeed(RES.fail(r.cause))
      }
    })
  )
}

/**
 * Returns a query that models execution of this query, followed by passing
 * its result to the specified function that returns a query. Requests
 * composed with `flatMap` or combinators derived from it will be executed
 * sequentially and will not be pipelined, though deduplication and caching of
 * requests may still be applied.
 * @dataFirst chain_
 */
export function chain<R1, E1, A, B>(f: (a: A) => Query<R1, E1, B>) {
  return <R, E>(self: Query<R, E, A>): Query<R & R1, E | E1, B> => chain_(self, f)
}

/**
 * Returns a query whose failure and success have been lifted into an
 * `Either`. The resulting query cannot fail, because the failure case has
 * been exposed as part of the `Either` success case.
 */
export function either<R, E, A>(self: Query<R, E, A>): Query<R, never, E.Either<E, A>> {
  return fold_<R, E, A, E.Either<E, A>>(self, E.left, E.right)
}

/**
 * Folds over the failed or successful result of this query to yield a query
 * that does not fail, but succeeds with the value returned by the left or
 * right function passed to `fold`.
 */
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
  )
}

/**
 * Folds over the failed or successful result of this query to yield a query
 * that does not fail, but succeeds with the value returned by the left or
 * right function passed to `fold`.
 * @dataFirst fold_
 */
export function fold<B, E, A>(failure: (e: E) => B, success: (a: A) => B) {
  return <R>(self: Query<R, E, A>): Query<R, never, B> => fold_(self, failure, success)
}

/**
 * A more powerful version of `foldM` that allows recovering from any type
 * of failure except interruptions.
 */
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
              RES.blocked(_.blockedRequests, CONT.foldCauseM_(_.cont, failure, success))
            ) as Query<R & R2 & R3, E2 | E3, A2 | A3>["step"]
          case "Done":
            return success(_.value).step
          case "Fail":
            return failure(_.cause).step
        }
      }
    )
  )
}

/**
 * A more powerful version of `foldM` that allows recovering from any type
 * of failure except interruptions.
 * @dataFirst foldCauseM_
 */
export function foldCauseM<E, A, R2, E2, A2, R3, E3, A3>(
  failure: (cause: C.Cause<E>) => Query<R2, E2, A2>,
  success: (a: A) => Query<R3, E3, A3>
) {
  return <R>(self: Query<R, E, A>): Query<R & R2 & R3, E2 | E3, A2 | A3> =>
    foldCauseM_(self, failure, success)
}

/**
 * Recovers from errors by accepting one query to execute for the case of an
 * error, and one query to execute for the case of success.
 */
export function foldM_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Query<R, E, A>,
  failure: (failure: E) => Query<R2, E2, A2>,
  success: (a: A) => Query<R3, E3, A3>
): Query<R & R2 & R3, E2 | E3, A2 | A3> {
  return foldCauseM_(self, (c) => E.fold_(C.failureOrCause(c), failure, halt), success)
}

/**
 * Recovers from errors by accepting one query to execute for the case of an
 * error, and one query to execute for the case of success.
 * @dataFirst foldM_
 */
export function foldM<E, A, R2, E2, A2, R3, E3, A3>(
  failure: (failure: E) => Query<R2, E2, A2>,
  success: (a: A) => Query<R3, E3, A3>
) {
  return <R>(self: Query<R, E, A>): Query<R & R2 & R3, E2 | E3, A2 | A3> =>
    foldM_(self, failure, success)
}

/**
 * Maps the specified function over the successful result of this query.
 */
export function map_<R, E, A, B>(self: Query<R, E, A>, f: (a: A) => B): Query<R, E, B> {
  return new Query(T.map_(self.step, RES.map(f)))
}

/**
 * Maps the specified function over the successful result of this query.
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: Query<R, E, A>): Query<R, E, B> => map_(self, f)
}

/**
 * Transforms all data sources with the specified data source aspect.
 */
export function mapDataSources_<R1, R, E, A>(
  self: Query<R, E, A>,
  f: DataSourceAspect<R1>
): Query<R & R1, E, A> {
  return new Query(T.map_(self.step, RES.mapDataSources(f)))
}

/**
 * Transforms all data sources with the specified data source aspect.
 * @dataFirst mapDataSources_
 */
export function mapDataSources<R1, R>(f: DataSourceAspect<R1>) {
  return <E, A>(self: Query<R, E, A>): Query<R & R1, E, A> => mapDataSources_(self, f)
}

/**
 * Maps the specified function over the failed result of this query.
 */
export function mapError_<R, E, A, E1>(self: Query<R, E, A>, f: (a: E) => E1) {
  return bimap_(self, f, identity)
}
/**
 * Maps the specified function over the failed result of this query.
 * @dataFirst mapError_
 */
export function mapError<E, E1>(f: (a: E) => E1) {
  return <R, A>(self: Query<R, E, A>): Query<R, E1, A> => mapError_(self, f)
}

/**
 * Returns a query whose failure and success channels have been mapped by the
 * specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, A, E1, B>(
  self: Query<R, E, A>,
  f: (e: E) => E1,
  g: (a: A) => B
): Query<R, E1, B> {
  return foldM_(
    self,
    (e) => fail(f(e)),
    (a) => succeed(g(a))
  )
}

/**
 * Returns a query whose failure and success channels have been mapped by the
 * specified pair of functions, `f` and `g`.
 * @dataFirst bimap_
 */
export function bimap<E, E1, A, B>(f: (e: E) => E1, g: (a: A) => B) {
  return <R>(self: Query<R, E, A>): Query<R, E1, B> => bimap_(self, f, g)
}

/**
 * Provides this query with part of its required environment.
 */
export function provideSome_<R, E, A, R0>(
  self: Query<R, E, A>,
  description: string,
  f: (r: R0) => R
): Query<R0, E, A> {
  return new Query(
    pipe(
      self.step,
      T.map(RES.provideSome(description, f)),
      T.provideSome((r) => tuple(f(r[0]), r[1]))
    )
  )
}

/**
 * Provides this query with part of its required environment.
 * @dataFirst provideSome_
 */
export function provideSome<R, R0>(description: string, f: (r: R0) => R) {
  return <E, A>(self: Query<R, E, A>): Query<R0, E, A> =>
    provideSome_(self, description, f)
}
/**
 * Returns a query that models the execution of this query and the specified
 * query sequentially, combining their results into a tuple.
 */
export function zip_<R, R1, E, E1, A, B>(
  self: Query<R, E, A>,
  that: Query<R1, E1, B>
): Query<R & R1, E | E1, readonly [A, B]> {
  return zipWith_(self, that, (a, b) => tuple(a, b))
}

/**
 * Returns a query that models the execution of this query and the specified
 * query sequentially, combining their results into a tuple.
 * @dataFirst zip_
 */
export function zip<R1, E1, B>(that: Query<R1, E1, B>) {
  return <R, E, A>(self: Query<R, E, A>): Query<R & R1, E | E1, readonly [A, B]> =>
    zip_(self, that)
}

/**
 * Returns a query that models the execution of this query and the specified
 * query sequentially, combining their results with the specified function.
 * Requests composed with `zipWith` or combinators derived from it will
 * automatically be pipelined.
 */
export function zipWith_<R, E, R1, E1, B, A, C>(
  self: Query<R, E, A>,
  that: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): Query<R & R1, E | E1, C> {
  return new Query(
    T.chain_(self.step, (res) => {
      switch (res._tag) {
        case "Blocked": {
          if (res.cont._tag === "Effect") {
            return T.succeed(
              RES.blocked(
                res.blockedRequests,
                CONT.effect(zipWith_(res.cont.query, that, f))
              )
            )
          } else {
            return T.map_(that.step, (res2) => {
              switch (res2._tag) {
                case "Blocked":
                  return RES.blocked(
                    BRS.then(res2.blockedRequests)(res.blockedRequests),
                    CONT.zipWith(res2.cont, f)(res.cont)
                  )
                case "Done":
                  return RES.blocked(
                    res.blockedRequests,
                    CONT.map_(res.cont, (a) => f(a, res2.value))
                  )
                case "Fail":
                  return RES.fail(res2.cause)
              }
            })
          }
        }
        case "Done":
          return T.map_(that.step, (res2) => {
            switch (res2._tag) {
              case "Blocked":
                return RES.blocked(
                  res2.blockedRequests,
                  CONT.map_(res2.cont, (b) => f(res.value, b))
                )
              case "Done":
                return RES.done(f(res.value, res2.value))
              case "Fail":
                return RES.fail(res2.cause)
            }
          })
        case "Fail":
          return T.succeed(RES.fail(res.cause))
      }
    })
  )
}

/**
 * Returns a query that models the execution of this query and the specified
 * query sequentially, combining their results with the specified function.
 * Requests composed with `zipWith` or combinators derived from it will
 * automatically be pipelined.
 *
 * @dataFirst zipWith_
 */
export function zipWith<R1, E1, B, A, C>(that: Query<R1, E1, B>, f: (a: A, b: B) => C) {
  return <R, E>(self: Query<R, E, A>): Query<R & R1, E | E1, C> =>
    zipWith_(self, that, f)
}

/**
 * Returns a query that models the execution of this query and the specified
 * query in parallel, combining their results with the specified function.
 * Requests composed with `zipWithPar` or combinators derived from it will
 * automatically be batched.
 */
export function zipWithPar_<R, E, A, R1, E1, B, C>(
  self: Query<R, E, A>,
  that: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): Query<R & R1, E | E1, C> {
  return new Query(
    T.zipWithPar_(self.step, that.step, (a, b) => {
      switch (a._tag) {
        case "Blocked":
          switch (b._tag) {
            case "Blocked":
              return RES.blocked(
                BRS.both_(a.blockedRequests, b.blockedRequests),
                CONT.zipWithPar(b.cont, f)(a.cont)
              )
            case "Done":
              return RES.blocked(
                a.blockedRequests,
                CONT.map_(a.cont, (a) => f(a, b.value))
              )
            case "Fail":
              return RES.fail(b.cause)
          }
        case "Done":
          switch (b._tag) {
            case "Blocked":
              return RES.blocked(
                b.blockedRequests,
                CONT.map_(b.cont, (b) => f(a.value, b))
              )
            case "Done":
              return RES.done(f(a.value, b.value))
            case "Fail":
              return RES.fail(b.cause)
          }
        case "Fail":
          switch (b._tag) {
            case "Blocked":
              return RES.fail(a.cause)
            case "Done":
              return RES.fail(a.cause)
            case "Fail":
              return RES.fail(C.both(a.cause, b.cause))
          }
      }
    })
  )
}

/**
 * Returns a query that models the execution of this query and the specified
 * query in parallel, combining their results with the specified function.
 * Requests composed with `zipWithPar` or combinators derived from it will
 * automatically be batched.
 *
 * @dataFirst zipWithPar_
 */
export function zipWithPar<R1, E1, B, A, C>(
  that: Query<R1, E1, B>,
  f: (a: A, b: B) => C
) {
  return <R, E>(self: Query<R, E, A>): Query<R & R1, E | E1, C> =>
    zipWithPar_(self, that, f)
}

/**
 * Summarizes a query by computing some value before and after execution,
 * and then combining the values to produce a summary, together with the
 * result of execution.
 */
export function summarized_<R, E, A, R1, E1, B, C>(
  self: Query<R, E, A>,
  summary: T.Effect<R1, E1, B>,
  f: (a: B, b: B) => C
): Query<R & R1, E | E1, readonly [C, A]> {
  return chain_(
    chain_(fromEffect(summary), (start) => map_(self, (a) => tuple(start, a))),
    ([start, a]) => map_(fromEffect(summary), (end) => tuple(f(start, end), a))
  )
}

/**
 * Summarizes a query by computing some value before and after execution,
 * and then combining the values to produce a summary, together with the
 * result of execution.
 *
 * @dataFirst summarized_
 */
export function summarized<A, R1, E1, B, C>(
  summary: T.Effect<R1, E1, B>,
  f: (a: B, b: B) => B
) {
  return <R, E>(self: Query<R, E, A>) => summarized_(self, summary, f)
}

/**
 * Constructs a query that fails with the specified cause.
 */
export function halt<E>(cause: C.Cause<E>) {
  return new Query(T.succeed(RES.fail(cause)))
}

/**
 * Constructs a query that never completes.
 */
export const never = fromEffect(T.never)

/**
 * Constructs a query that succeds with the empty value.
 */
export const none = fromEffect(T.none)

/**
 *  Constructs a query that succeeds with the specified value.
 */
export function succeed<A>(value: A) {
  return new Query(T.succeed(RES.done(value)))
}

/**
 *  Constructs a query that succeeds with the specified value.
 */
export function fail<E>(value: E) {
  return new Query(T.succeed(RES.fail(C.fail(value))))
}

/**
 * Constructs a query from an effect.
 */
export function fromEffect<R, E, A>(effect: T.Effect<R, E, A>): Query<R, E, A> {
  return new Query(
    T.provideSome_(T.foldCause_(effect, RES.fail, RES.done), (r) => r[0])
  )
}

/**
 * Returns a query which submerges the error case of `Either` into the error channel of the query
 *
 * The inverse of [[ZQuery.either]]
 */
export function absolve<R, E, A>(query: Query<R, E, E.Either<E, A>>): Query<R, E, A> {
  return chain_(query, fromEither)
}

/**
 * Performs a query for each element in a collection, collecting the results
 * into a query returning a collection of their results. Requests will be
 * executed sequentially and will be pipelined.
 */
export function forEach_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Query<R, E, B>
): Query<R, E, A.Array<B>> {
  const arr = A.from(as)
  return arr.length === 0
    ? fromEffect(T.succeed([]))
    : A.reduce_(
        arr.slice(1),
        map_(f(as[0]), (_) => A.from([_])),
        (builder, a) => zipWith_(builder, f(a), (arr, item) => A.concat_(arr, [item]))
      )
}

/**
 * Performs a query for each element in a collection, collecting the results
 * into a query returning a collection of their results. Requests will be
 * executed sequentially and will be pipelined.
 */
export function forEach<R, E, A, B>(
  f: (a: A) => Query<R, E, B>
): (as: Iterable<A>) => Query<R, E, A.Array<B>> {
  return (as) => forEach_(as, f)
}

/**
 * Constructs a query from an either
 */
export function fromEither<E, A>(either: E.Either<E, A>): Query<unknown, E, A> {
  return chain_(succeed(either), E.fold(fail, succeed))
}

/**
 * Constructs a query from an option
 */
export function fromOption<A>(option: O.Option<A>): Query<unknown, O.Option<never>, A> {
  return chain_(
    succeed(option),
    O.fold(() => fail(O.none), succeed)
  )
}

/**
 * Collects a collection of queries into a query returning a collection of
 * their results. Requests will be executed sequentially and will be
 * pipelined.
 */
export function collectAll<R, E, A>(
  as: Iterable<Query<R, E, A>>
): Query<R, E, A.Array<A>> {
  return forEach_(as, identity)
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
                () => RES.blocked(BRS.empty, CONT.apply(request, dataSource, rightRef)),
                (b) => RES.fromEither(b)
              )
            )
        )
      )
    )
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
            )
          case "Done":
            return T.succeed(_.value)
          case "Fail":
            return T.halt(_.cause)
        }
      }
    )
}

/**
 * Returns an effect that models executing this query.
 */
export function run<R, E, A>(query: Query<R, E, A>): T.Effect<R, E, A> {
  return T.map_(runLog(query), ([_, a]) => a)
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
  )
}

/**
 * Performs a query for each element in a collection, collecting the results
 * into a query returning a collection of their results. Requests will be
 * executed parallely and will be pipelined.
 */
export function forEachPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Query<R, E, B>
): Query<R, E, A.Array<B>> {
  const arr = A.from(as)
  return arr.length === 0
    ? fromEffect(T.succeed([]))
    : A.reduce_(
        arr.slice(1),
        map_(f(arr[0]), (a) => A.from([a])),
        (q, a) => zipWithPar_(q, f(a), (a, b) => A.concat_(a, [b]))
      )
}

/**
 * Performs a query for each element in a collection, collecting the results
 * into a query returning a collection of their results. Requests will be
 * executed parallely and will be pipelined.
 *
 * @dataFirst forEachPar
 */
export function forEachPar<R, E, A, B>(
  f: (a: A) => Query<R, E, B>
): (as: Iterable<A>) => Query<R, E, A.Array<B>> {
  return (as) => forEachPar_(as, f)
}

/**
 * Collects a collection of queries into a query returning a collection of
 * their results. Requests will be executed in parallel and will be batched.
 */
export function collectAllPar<R, E, A>(
  as: Iterable<Query<R, E, A>>
): Query<R, E, A.Array<A>> {
  return forEachPar_(as, identity)
}

/**
 * Returns a new query that executes this one and times the execution.
 */
export function timed<R, E, A>(
  self: Query<R, E, A>
): Query<R & Has<CL.Clock>, E, readonly [number, A]> {
  return summarized_(self, CL.currentTime, (start, end) => end - start)
}

/**
 * Converts this query to one that returns `Some` if data sources return
 * results for all requests received and `None` otherwise.
 */
export function optional<R, E, A>(self: Query<R, E, A>): Query<R, E, O.Option<A>> {
  return foldCauseM_(
    self,
    (cause) =>
      O.fold_(
        pipe(
          cause,
          C.find((_) =>
            _._tag === "Die" && _.value instanceof QueryFailure
              ? O.some(_.value)
              : O.none
          )
        ),
        () => halt(cause),
        () => none
      ),
    (_) => succeed(O.some(_))
  )
}

/**
 * Lifts the error channel into a `Some` value for composition with other optional queries
 *
 * @see [[ZQuery.some]]
 */
export function asSomeError<R, E, A>(self: Query<R, E, A>): Query<R, O.Option<E>, A> {
  return mapError_(self, O.some)
}

/**
 * Recovers from all errors.
 */
export function catchAll_<R, E, A, R1, E1, B>(
  self: Query<R, E, A>,
  h: (e: E) => Query<R1, E1, B>
): Query<R & R1, E1, A | B> {
  return foldM_(self, h, succeed)
}

/**
 * Recovers from all errors.
 * @dataFirst catchAll_
 */
export function catchAll<R, E, A, R1, E1, B>(h: (e: E) => Query<R1, E1, B>) {
  return (self: Query<R, E, A>): Query<R & R1, E1, A | B> => catchAll_(self, h)
}

/**
 * Recovers from all errors with provided Cause.
 *
 * @see [[ZQuery.sandbox]] - other functions that can recover from defects
 */
export function catchAllCause_<R, E, A, R1, E1, A1>(
  self: Query<R, E, A>,
  h: (cause: C.Cause<E>) => Query<R1, E1, A1>
): Query<R & R1, E1, A | A1> {
  return foldCauseM_(self, h, succeed)
}

/**
 * Recovers from all errors with provided Cause.
 *
 * @see [[ZQuery.sandbox]] - other functions that can recover from defects
 * @dataFirst catchAllCause_
 */
export function catchAllCause<R, E, A, R1, E1, A1>(
  h: (cause: C.Cause<E>) => Query<R1, E1, A1>
) {
  return (self: Query<R, E, A>): Query<R & R1, E1, A | A1> => catchAllCause_(self, h)
}

/**
 * Returns a query that performs the outer query first, followed by the inner
 * query, yielding the value of the inner query.
 *
 * This method can be used to "flatten" nested queries.
 */
export function flatten<R, E, R1, E1, A1>(
  self: Query<R, E, Query<R1, E1, A1>>
): Query<R & R1, E | E1, A1> {
  return chain_(self, identity)
}

/**
 * Returns a successful query if the value is `Left`, or fails with the error `None`.
 */
export function left<R, E, B, C>(
  self: Query<R, E, E.Either<B, C>>
): Query<R, O.Option<E>, B> {
  return foldM_(
    self,
    (e) => fail(O.some(e)),
    (a) => E.fold_(a, succeed, (_) => fail(O.none))
  )
}

/**
 * Returns a successful query if the value is `Left`, or fails with the error e.
 */
export function leftOrFail_<R, E, B, C, E1>(
  self: Query<R, E, E.Either<B, C>>,
  e: E1
): Query<R, E | E1, B> {
  return chain_(self, (_) => E.fold_(_, succeed, () => fail(e)))
}

/**
 * Returns a successful query if the value is `Left`, or fails with the error e.
 * @dataFirst leftOrFail_
 */
export function leftOrFail<R, E, B, C, E1>(e: E1) {
  return (self: Query<R, E, E.Either<B, C>>): Query<R, E | E1, B> =>
    leftOrFail_(self, e)
}

/**
 * Returns a successful query if the value is `Left`, or fails with the given error function 'e'.
 */
export function leftOrFailWith_<R, E, B, C, E1>(
  self: Query<R, E, E.Either<B, C>>,
  e: (c: C) => E1
): Query<R, E | E1, B> {
  return chain_(self, (ei) => E.fold_(ei, succeed, (err) => fail(e(err))))
}

/**
 * Returns a successful query if the value is `Left`, or fails with the given error function 'e'.
 * @dataFirst leftOrFailWith_
 */
export function leftOrFailWith<R, E, B, C, E1>(e: (c: C) => E1) {
  return (self: Query<R, E, E.Either<B, C>>): Query<R, E | E1, B> =>
    leftOrFailWith_(self, e)
}

/**
 * Returns a query with its full cause of failure mapped using the
 * specified function. This can be used to transform errors while
 * preserving the original structure of `Cause`.
 *
 * @see [[sandbox]], [[catchAllCause]] - other functions for dealing with defects
 */
export function mapErrorCause_<R, E, A, E2>(
  self: Query<R, E, A>,
  h: (cause: C.Cause<E>) => C.Cause<E2>
): Query<R, E2, A> {
  return foldCauseM_(self, (c) => halt(h(c)), succeed)
}

/**
 * Returns a query with its full cause of failure mapped using the
 * specified function. This can be used to transform errors while
 * preserving the original structure of `Cause`.
 *
 * @see [[sandbox]], [[catchAllCause]] - other functions for dealing with defects
 * @dataFirst mapErrorCause_
 */
export function mapErrorCause<R, E, A, E2>(h: (cause: C.Cause<E>) => C.Cause<E2>) {
  return (self: Query<R, E, A>): Query<R, E2, A> => mapErrorCause_(self, h)
}

/**
 * Converts this query to one that dies if a query failure occurs.
 */
export function orDie<R, E, A>(self: Query<R, E, A>): Query<R, never, A> {
  return orDieWith_(self, identity)
}

/**
 * Converts this query to one that dies if a query failure occurs, using the
 * specified function to map the error to a `Throwable`.
 */
export function orDieWith_<R, E, A>(
  self: Query<R, E, A>,
  f: (e: E) => unknown
): Query<R, never, A> {
  return foldM_(
    self,
    (e) => die(f(e)) as Query<R, never, A>,
    (a) => succeed(a)
  )
}

/**
 * Converts this query to one that dies if a query failure occurs, using the
 * specified function to map the error to a `Throwable`.
 * @dataFirst orDieWith_
 */
export function orDieWith<R, E, A>(f: (e: E) => unknown) {
  return (self: Query<R, E, A>): Query<R, never, A> => orDieWith_(self, f)
}

/**
 * Constructs a query that dies with the specified error.
 */
export function die(cause: unknown): Query<unknown, never, void> {
  return new Query(T.die(cause))
}

/**
 * Provides this query with its required environment.
 */
export function provide_<R, E, A>(
  self: Query<R, E, A>,
  description: string,
  env: R
): Query<unknown, E, A> {
  return provideSome_(self, `_ => ${description}`, (_) => env)
}

/**
 * Provides this query with its required environment.
 * @dataFirst provide_
 */
export function provide<R, E, A>(description: string, env: R) {
  return (self: Query<R, E, A>): Query<unknown, E, A> =>
    provide_(self, description, env)
}
