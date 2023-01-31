import * as Cause from "@effect/io/Cause"
import type * as Exit from "@effect/io/Exit"
import type * as BlockedRequests from "@effect/query/internal/blockedRequests"
import type * as Continue from "@effect/query/internal/continue"
import * as Either from "@fp-ts/core/Either"

/**
 * A `Result<R, E, A>` is the result of running one step of a `Query`. A result
 * may either by done with a value `A`, blocked on a set of requests to data
 * sources that require an environment `R`, or failed with an `E`.
 *
 * @internal
 */
export type Result<R, E, A> = Blocked<R, E, A> | Done<A> | Fail<E>

/** @internal */
export interface Blocked<R, E, A> {
  readonly _tag: "Blocked"
  readonly blockedRequests: BlockedRequests.BlockedRequests<R>
  readonly continue: Continue.Continue<R, E, A>
}

/** @internal */
export interface Done<A> {
  readonly _tag: "Done"
  readonly value: A
}

/** @internal */
export interface Fail<E> {
  readonly _tag: "Fail"
  readonly cause: Cause.Cause<E>
}

/**
 * Constructs a result that is blocked on the specified requests with the
 * specified continuation.
 *
 * @internal
 */
export const blocked = <R, E, A>(
  blockedRequests: BlockedRequests.BlockedRequests<R>,
  _continue: Continue.Continue<R, E, A>
): Result<R, E, A> => ({
  _tag: "Blocked",
  blockedRequests,
  continue: _continue
})

/**
 * Constructs a result that is done with the specified value.
 *
 * @internal
 */
export const done = <A>(value: A): Result<never, never, A> => ({
  _tag: "Done",
  value
})

/**
 * Constructs a result that is failed with the specified `Cause`.
 *
 * @internal
 */
export const fail = <E>(cause: Cause.Cause<E>): Result<never, E, never> => ({
  _tag: "Fail",
  cause
})

/**
 * Returns `true` if the result is blocked, `false` otherwise.
 *
 * @internal
 */
export const isBlocked = <R, E, A>(result: Result<R, E, A>): result is Blocked<R, E, A> => result._tag === "Blocked"

/**
 * Returns `true` if the result is done, `false` otherwise.
 *
 * @internal
 */
export const isDone = <R, E, A>(result: Result<R, E, A>): result is Done<A> => result._tag === "Done"

/**
 * Returns `true` if the result failed, `false` otherwise.
 *
 * @internal
 */
export const isFail = <R, E, A>(result: Result<R, E, A>): result is Fail<E> => result._tag === "Fail"

/**
 * Lifts an `Either` into a result.
 *
 * @internal
 */
export const fromEither: <E, A>(either: Either.Either<E, A>) => Result<never, E, A> = Either.match(
  (left) => fail(Cause.fail(left)),
  done
)

/**
 * Lifts an `Exit` into a result.
 *
 * @internal
 */
export const fromExit = <E, A>(exit: Exit.Exit<E, A>): Result<never, E, A> => {
  switch (exit._tag) {
    case "Failure": {
      return fail(exit.cause)
    }
    case "Success": {
      return done(exit.value)
    }
  }
}
