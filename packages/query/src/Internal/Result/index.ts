// tracing: off

import { _A, _E, _R } from "@effect-ts/core/Effect"
import * as E from "@effect-ts/core/Either"
import { pipe } from "@effect-ts/core/Function"
import * as C from "@effect-ts/system/Cause"

import type { DataSourceAspect } from "../../DataSourceAspect"
import * as BRS from "../BlockedRequests"
import type { Continue } from "../Continue"
import * as CONT from "../Continue"

class Blocked<R, E, A> {
  readonly _tag = "Blocked";
  readonly [_R]!: (r: R) => never;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A
  constructor(
    public readonly blockedRequests: BRS.BlockedRequests<R>,
    public readonly cont: Continue<R, E, A>
  ) {}
}

class Done<A> {
  readonly _tag = "Done";
  readonly [_A]!: () => A
  constructor(public readonly value: A) {}
}

class Fail<E> {
  readonly _tag = "Fail";
  readonly [_E]!: () => E
  constructor(public readonly cause: C.Cause<E>) {}
}

export type Result<R, E, A> = Blocked<R, E, A> | Done<A> | Fail<E>

/**
 * Folds over the successful or failed result.
 */
export function fold<E, A, B>(
  failure: (e: E) => B,
  success: (a: A) => B
): <R>(fa: Result<R, E, A>) => Result<R, never, B> {
  return (fa) => {
    switch (fa._tag) {
      case "Blocked":
        return blocked(fa.blockedRequests, pipe(fa.cont, CONT.fold(failure, success)))
      case "Done":
        return done(success(fa.value))
      case "Fail":
        return pipe(
          C.failureOrCause(fa.cause),
          E.fold(
            (e) => done(failure(e)),
            (c) => fail(c)
          )
        )
    }
  }
}

/**
 * Maps the specified function over the successful value of this result.
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: Result<R, E, A>): Result<R, E, B> => {
    switch (self._tag) {
      case "Blocked":
        return blocked(self.blockedRequests, CONT.map(f)(self.cont))
      case "Done":
        return done(f(self.value))
      case "Fail":
        return fail(self.cause)
    }
  }
}

/**
 * Transforms all data sources with the specified data source aspect.
 */
export function mapDataSources<R1>(f: DataSourceAspect<R1>) {
  return <R, E, A>(self: Result<R, E, A>): Result<R & R1, E, A> => {
    switch (self._tag) {
      case "Blocked":
        return blocked(
          BRS.mapDataSources_(self.blockedRequests, f),
          CONT.mapDataSources_(self.cont, f)
        )
      case "Done":
        return done(self.value)
      case "Fail":
        return fail(self.cause)
    }
  }
}

/**
 * Maps the specified function over the failed value of this result.
 */
export function mapError<E, E1>(f: (a: E) => E1) {
  return <R, A>(self: Result<R, E, A>): Result<R, E1, A> => {
    switch (self._tag) {
      case "Blocked":
        return blocked(self.blockedRequests, CONT.mapError(f)(self.cont))
      case "Done":
        return done(self.value)
      case "Fail":
        return fail(C.map(f)(self.cause))
    }
  }
}

/**
 * Constructs a result that is blocked on the specified requests with the
 * specified continuation.
 */
export function blocked<R, E, A>(
  blockedRequests: BRS.BlockedRequests<R>,
  cont: Continue<R, E, A>
): Result<R, E, A> {
  return new Blocked(blockedRequests, cont)
}

/**
 * Constructs a result that is done with the specified value.
 */
export function done<A>(value: A): Result<unknown, never, A> {
  return new Done(value)
}

/**
 * Constructs a result that is failed with the specified `Cause`.
 */
export function fail<E>(cause: C.Cause<E>): Result<unknown, E, never> {
  return new Fail(cause)
}

/**
 * Lifts an `Either` into a result.
 */
export function fromEither<E, A>(either: E.Either<E, A>): Result<unknown, E, A> {
  return E.fold_(
    either,
    (e) => fail(C.fail(e)),
    (a) => done(a)
  )
}

/**
 * Provides this result with part of its required environment.
 */
export function provideSome<R, R0>(description: string, f: (r: R0) => R) {
  return <E, A>(self: Result<R, E, A>): Result<R0, E, A> => {
    switch (self._tag) {
      case "Blocked":
        return blocked(
          BRS.provideSome(description, f)(self.blockedRequests),
          CONT.provideSome(description, f)(self.cont)
        )
      case "Done":
        return done(self.value)
      case "Fail":
        return fail(self.cause)
    }
  }
}
