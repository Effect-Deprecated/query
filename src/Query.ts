// port of: https://github.com/zio/zio-query/blob/5746d54dfbed8e3c35415355b09c8e6a54c49889/zio-query/shared/src/main/scala/zio/query/ZQuery.scala
import * as T from "@effect-ts/core/Effect";
import { Has } from "@effect-ts/core/Has";
import { QueryContext } from "./internal/QueryContext";
import * as RES from "./internal/Result";
import * as CONT from "./internal/Continue";
import * as C from "@effect-ts/system/Cause";
import { pipe } from "@effect-ts/core/Function";
import * as E from "@effect-ts/core/Classic/Either";

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
      R & Has<QueryContext>,
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
      (res) => {
        switch (res._tag) {
          case "Blocked":
            return T.succeed(
              RES.blocked(
                res.blockedRequests,
                CONT.foldCauseM_(res.cont, failure, success)
              )
            );
          case "Done":
            return success(res.value).step;
          case "Fail":
            return failure(res.cause).step;
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
 * Constructs a query from an effect.
 */
export function fromEffect<R, E, A>(
  effect: T.Effect<R & Has<QueryContext>, E, A>
): Query<R, E, A> {
  // TODO: Should the Has<QueryContext> be mixed in?
  return new Query(T.foldCause_(effect, RES.fail, RES.done));
}
