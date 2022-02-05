// ets_tracing: off

import "@effect-ts/system/Operator"

import * as Chunk from "@effect-ts/core/Collections/Immutable/Chunk"
import * as Tp from "@effect-ts/core/Collections/Immutable/Tuple"
import * as T from "@effect-ts/core/Effect"
import { _A, _E, _R } from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as F from "@effect-ts/core/Effect/Fiber"
import * as REF from "@effect-ts/core/Effect/Ref"
import * as E from "@effect-ts/core/Either"
import { identity, pipe, tuple } from "@effect-ts/core/Function"
import type { Has, Tag } from "@effect-ts/core/Has"
import * as O from "@effect-ts/core/Option"
import type { URI } from "@effect-ts/core/Prelude"
import * as P from "@effect-ts/core/Prelude"
import * as DSL from "@effect-ts/core/Prelude/DSL"
import type { _A as _GetA, _E as _GetE } from "@effect-ts/core/Utils"
import { isEither, isOption, isTag } from "@effect-ts/core/Utils"
import * as C from "@effect-ts/system/Cause"
import * as CL from "@effect-ts/system/Clock"
import { NoSuchElementException } from "@effect-ts/system/GlobalExceptions"

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
  readonly _tag = "Query";
  readonly [_R]!: (r: R) => void;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

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
  return new Query<R & R1, E | E1, B>(
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
 * @ets_data_first chain_
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
 * @ets_data_first fold_
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
 * @ets_data_first foldCauseM_
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
 * @ets_data_first foldM_
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
 * @ets_data_first map_
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
 * @ets_data_first mapDataSources_
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
 * @ets_data_first mapError_
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
 * @ets_data_first bimap_
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
 * @ets_data_first provideSome_
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
): Query<R & R1, E | E1, Tp.Tuple<[A, B]>> {
  return zipWith_(self, that, (a, b) => Tp.tuple(a, b))
}

/**
 * Returns a query that models the execution of this query and the specified
 * query sequentially, combining their results into a tuple.
 * @ets_data_first zip_
 */
export function zip<R1, E1, B>(that: Query<R1, E1, B>) {
  return <R, E, A>(self: Query<R, E, A>): Query<R & R1, E | E1, Tp.Tuple<[A, B]>> =>
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
  return new Query<R & R1, E | E1, C>(
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
 * @ets_data_first zipWith_
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
  return new Query<R & R1, E | E1, C>(
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
 * @ets_data_first zipWithPar_
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
 * @ets_data_first summarized_
 */
export function summarized<A, R1, E1, B, C>(
  summary: T.Effect<R1, E1, B>,
  f: (a: B, b: B) => B
) {
  return <R, E>(self: Query<R, E, A>) => summarized_(self, summary, f)
}

/**
 * Returns an effect that will timeout this query, returning `None` if the
 * timeout elapses before the query was completed.
 * @dataFirst timeout_
 */
export function timeout(duration: number) {
  return <R, E, A>(self: Query<R, E, A>) => timeout_(self, duration)
}

/**
 * Returns an effect that will timeout this query, returning `None` if the
 * timeout elapses before the query was completed.
 */
export function timeout_<R, E, A>(self: Query<R, E, A>, duration: number) {
  return timeoutTo_(self, O.none, O.some, duration)
}

/**
 * The same as [[timeout]], but instead of producing a `None` in the event
 * of timeout, it will produce the specified error.
 */
export function timeoutFail_<R, E, A, E1>(
  self: Query<R, E, A>,
  error: E1,
  duration: number
) {
  return flatten(
    timeoutTo_(self, fail(error), (a) => succeed(a) as Query<R, E | E1, A>, duration)
  )
}

/**
 * The same as [[timeout]], but instead of producing a `None` in the event
 * of timeout, it will produce the specified failure.
 * @dataFirst timeoutFail_
 */
export function timeoutFail<E1>(error: E1, duration: number) {
  return <R, E, A>(self: Query<R, E, A>) => timeoutFail_(self, error, duration)
}

/**
 * The same as [[timeout]], but instead of producing a `None` in the event
 * of timeout, it will produce the specified failure.
 */
export function timeoutHalt_<R, E, A, E1>(
  self: Query<R, E, A>,
  error: C.Cause<E1>,
  duration: number
) {
  return flatten(
    timeoutTo_(self, halt(error), (a) => succeed(a) as Query<R, E | E1, A>, duration)
  )
}

/**
 * The same as [[timeout]], but instead of producing a `None` in the event
 * of timeout, it will produce the specified error.
 * @dataFirst timeoutHalt_
 */
export function timeoutHalt<E1>(error: C.Cause<E1>, duration: number) {
  return <R, E, A>(self: Query<R, E, A>) => timeoutHalt_(self, error, duration)
}

export function timeoutTo_<R, E, A, B>(
  self: Query<R, E, A>,
  b: B,
  f: (a: A) => B,
  duration: number
) {
  function race<B1>(
    query: Query<R, E, B1>,
    fiber: F.FiberContext<never, B1>
  ): Query<R, E, B1> {
    return new Query(
      pipe(
        query.step,
        T.raceWith(
          F.join(fiber),
          (leftExit, rightFiber) =>
            Ex.foldM_(
              leftExit,
              (cause) =>
                T.zipRight_(F.interrupt(rightFiber), T.succeed(RES.fail(cause))),
              (result) => {
                switch (result._tag) {
                  case "Blocked":
                    switch (result.cont._tag) {
                      case "Effect":
                        return T.succeed(
                          RES.blocked(
                            result.blockedRequests,
                            CONT.effect(race(result.cont.query, fiber))
                          )
                        )
                      case "Get":
                        return T.succeed(
                          RES.blocked(
                            result.blockedRequests,
                            CONT.effect(race(fromEffect(result.cont.io), fiber))
                          )
                        )
                    }
                    break
                  case "Done":
                    return T.zipRight_(
                      F.interrupt(rightFiber),
                      T.succeed(RES.done(result.value))
                    )
                  case "Fail":
                    return T.zipRight_(
                      F.interrupt(rightFiber),
                      T.succeed(RES.fail(result.cause))
                    )
                }
              }
            ),
          (rightExit, leftFiber) =>
            pipe(
              F.interrupt(leftFiber),
              T.chain((ex) => T.succeed(RES.fromExit(rightExit)))
            )
        )
      )
    )
  }
  return pipe(
    fromEffect(pipe(CL.sleep(duration), T.interruptible, T.as(b), T.fork)),
    chain((fiber) => race(map_(self, f), fiber))
  )
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
): Query<R, E, Chunk.Chunk<B>> {
  const arr = Chunk.from(as)
  return Chunk.size(arr) === 0
    ? fromEffect(T.succeed(Chunk.empty()))
    : Chunk.reduce_(
        Chunk.drop_(arr, 1),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        map_(f(Chunk.unsafeGet_(arr, 0)!), (_) => Chunk.single(_)),
        (builder, a) => zipWith_(builder, f(a), (arr, item) => Chunk.append_(arr, item))
      )
}

/**
 * Performs a query for each element in a collection, collecting the results
 * into a query returning a collection of their results. Requests will be
 * executed sequentially and will be pipelined.
 *
 * @ets_data_first forEach_
 */
export function forEach<R, E, A, B>(
  f: (a: A) => Query<R, E, B>
): (as: Iterable<A>) => Query<R, E, Chunk.Chunk<B>> {
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
): Query<R, E, Chunk.Chunk<A>> {
  return forEach_(as, identity)
}

/**
 * Constructs a query from a request and a data source. Queries will die with
 * a `QueryFailure` when run if the data source does not provide results for
 * all requests received. Queries must be constructed with `fromRequest` or
 * one of its variants for optimizations to be applied.
 */
export function fromRequest<R, A extends Request<any, any>>(
  request: A,
  dataSource: DataSource<R, A>
) {
  return new Query<R, _GetE<A>, _GetA<A>>(
    T.chain_(
      T.accessM(([_, queryContext]: readonly [R, QueryContext]) =>
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
            return T.zipRight_(
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
): Query<R, E, Chunk.Chunk<B>> {
  const arr = Chunk.from(as)
  return Chunk.size(arr) === 0
    ? fromEffect(T.succeed(Chunk.empty()))
    : Chunk.reduce_(
        Chunk.drop_(arr, 1),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        map_(f(Chunk.unsafeGet_(arr, 0)!), (_) => Chunk.single(_)),
        (builder, a) =>
          zipWithPar_(builder, f(a), (arr, item) => Chunk.append_(arr, item))
      )
}

/**
 * Performs a query for each element in a collection, collecting the results
 * into a query returning a collection of their results. Requests will be
 * executed parallely and will be pipelined.
 *
 * @ets_data_first forEachPar_
 */
export function forEachPar<R, E, A, B>(
  f: (a: A) => Query<R, E, B>
): (as: Iterable<A>) => Query<R, E, Chunk.Chunk<B>> {
  return (as) => forEachPar_(as, f)
}

/**
 * Collects a collection of queries into a query returning a collection of
 * their results. Requests will be executed in parallel and will be batched.
 */
export function collectAllPar<R, E, A>(
  as: Iterable<Query<R, E, A>>
): Query<R, E, Chunk.Chunk<A>> {
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
 * @ets_data_first catchAll_
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
 * @ets_data_first catchAllCause_
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
 * @ets_data_first leftOrFail_
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
 * @ets_data_first leftOrFailWith_
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
 * @ets_data_first mapErrorCause_
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
 * @ets_data_first orDieWith_
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
 * @ets_data_first provide_
 */
export function provide<R, E, A>(description: string, env: R) {
  return (self: Query<R, E, A>): Query<unknown, E, A> =>
    provide_(self, description, env)
}

/**
 * Effectfully accesses the environment of the query.
 */
export function access<R0, A>(fn: (env: R0) => A): Query<R0, never, A> {
  return fromEffect(T.access(fn))
}

/**
 * Effectfully accesses the environment of the query.
 */
export function accessM<R0, R, E, A>(
  fn: (env: R0) => Query<R, E, A>
): Query<R0 & R, E, A> {
  return chain_(fromEffect(T.access<R0, R0>(identity)), fn)
}

/**
 * Extracts the optional value or fails with NoSuchElementException.
 */
export function getOrFail<A>(
  value: O.Option<A>
): Query<unknown, NoSuchElementException, A> {
  return O.fold_(value, () => fail(new NoSuchElementException()), succeed)
}

export const QueryURI = "@effect-ts/query/Query"
export type QueryURI = typeof QueryURI

declare module "@effect-ts/core/Prelude/HKT" {
  interface URItoKind<FC, TC, K, Q, W, X, I, S, R, E, A> {
    [QueryURI]: Query<R, E, A>
  }
}

export type V = P.V<"R", "-"> & P.V<"E", "+">

export const Any = P.instance<P.Any<[URI<QueryURI>], V>>({
  any: () => succeed({})
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[URI<QueryURI>], V>>({
  flatten
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[URI<QueryURI>], V>>({
  both: zip
})

export const Covariant = P.instance<P.Covariant<[URI<QueryURI>], V>>({
  map
})

export const IdentityFlatten = P.instance<P.IdentityFlatten<[URI<QueryURI>], V>>({
  ...Any,
  ...AssociativeFlatten
})

export const IdentityBoth = P.instance<P.IdentityBoth<[URI<QueryURI>], V>>({
  ...Any,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<[URI<QueryURI>], V>>({
  ...IdentityFlatten,
  ...Covariant
})

export const Applicative = P.instance<P.Applicative<[URI<QueryURI>], V>>({
  ...Covariant,
  ...IdentityBoth
})

export const Fail = P.instance<P.FX.Fail<[URI<QueryURI>], V>>({
  fail
})

export const Run = P.instance<P.FX.Run<[URI<QueryURI>], V>>({
  either
})

const adapter: {
  <E, A>(_: O.Option<A>, onNone: () => E): DSL.GenHKT<Query<unknown, E, A>, A>
  <A>(_: O.Option<A>): DSL.GenHKT<Query<unknown, NoSuchElementException, A>, A>
  <A>(_: Tag<A>): DSL.GenHKT<Query<Has<A>, never, A>, A>
  <E, A>(_: E.Either<E, A>): DSL.GenHKT<Query<unknown, E, A>, A>
  <R, E, A>(_: T.Effect<R, E, A>): DSL.GenHKT<Query<R, E, A>, A>
  <R, E, A>(_: Query<R, E, A>): DSL.GenHKT<Query<R, E, A>, A>
} = (_: any, __?: any): any => {
  if (isEither(_)) {
    return new DSL.GenHKT(fromEither(_))
  }
  if (isOption(_)) {
    if (__) {
      return new DSL.GenHKT(
        __ ? (_._tag === "None" ? fail(__()) : succeed(_.value)) : getOrFail(_)
      )
    }
    return new DSL.GenHKT(getOrFail(_))
  }
  if (isTag(_)) {
    return new DSL.GenHKT(fromEffect(T.service(_)))
  }
  if (_ instanceof Query) {
    return new DSL.GenHKT(_)
  }
  return new DSL.GenHKT(fromEffect(_))
}

export const gen = P.genF(Monad, { adapter })

export const bind = P.bindF(Monad)

const let_ = P.letF(Monad)

const do_ = P.doF(Monad)

export { do_ as do, let_ as let }
export { branch as if, branch_ as if_ }

export const struct = P.structF({ ...Monad, ...Applicative })

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  P.matchers(Covariant)

/**
 * Conditionals
 */
const branch = P.conditionalF(Covariant)
const branch_ = P.conditionalF_(Covariant)
