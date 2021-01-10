import * as C from "@effect-ts/system/Cause";
import * as BR from "./BlockedRequests";
import { Continue } from "./Continue";
import * as CONT from "./Continue";
import { pipe } from "@effect-ts/core/Function";
import * as E from "@effect-ts/core/Classic/Either";
import { Described } from "src/Described";

class Blocked<R, E, A> {
  readonly _tag = "Blocked";
  readonly _R!: (r: R) => never;
  readonly _E!: () => E;
  readonly _A!: () => A;
  constructor(
    public readonly blockedRequests: BR.BlockedRequests<R>,
    public readonly cont: Continue<R, E, A>
  ) {}
}

class Done<A> {
  readonly _tag = "Done";
  readonly _A!: () => A;
  constructor(public readonly value: A) {}
}

class Fail<E> {
  readonly _tag = "Fail";
  readonly _E!: () => E;
  constructor(public readonly cause: C.Cause<E>) {}
}

export type Result<R, E, A> = Blocked<R, E, A> | Done<A> | Fail<E>;

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
        return blocked(
          fa.blockedRequests,
          pipe(fa.cont, CONT.fold(failure, success))
        );
      case "Done":
        return done(success(fa.value));
      case "Fail":
        return pipe(
          C.failureOrCause(fa.cause),
          E.fold(
            (e) => done(failure(e)),
            (c) => fail(c)
          )
        );
    }
  };
}

/**
 * Constructs a result that is blocked on the specified requests with the
 * specified continuation.
 */
export function blocked<R, E, A>(
  blockedRequests: BR.BlockedRequests<R>,
  cont: Continue<R, E, A>
): Result<R, E, A> {
  return new Blocked(blockedRequests, cont);
}

/**
 * Constructs a result that is done with the specified value.
 */
export function done<A>(value: A): Result<unknown, never, A> {
  return new Done(value);
}

/**
 * Constructs a result that is failed with the specified `Cause`.
 */
export function fail<E>(cause: C.Cause<E>): Result<unknown, E, never> {
  return new Fail(cause);
}

/**
 * Provides this result with part of its required environment.
 */
export function provideSome<R, R0>(f: Described<(r: R0) => R>) {
  return <E, A>(self: Result<R, E, A>): Result<R0, E, A> => {
    switch (self._tag) {
      case "Blocked":
        return blocked(
          BR.provideSome(f)(self.blockedRequests),
          CONT.provideSome(f)(self.cont)
        );
      case "Done":
        return done(self.value);
      case "Fail":
        return fail(self.cause);
    }
  };
}
