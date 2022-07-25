import type { BlockedRequests } from "@effect/query/_internal/BlockedRequests/definition"
import type { Continue } from "@effect/query/_internal/Continue/definition"

export const ResultSym = Symbol.for("@effect/query/_internal/Result")
export type ResultSym = typeof ResultSym

/**
 * A `Result<R, E, A>` is the result of running one step of a `Query`. A
 * result may either by done with a value `A`, blocked on a set of requests
 * to data sources that require an environment `R`, or failed with an `E`.
 *
 * @tsplus type effect/query/Result
 */
export type Result<R, E, A> = Blocked<R, E, A> | Done<A> | Fail<E>

export class Blocked<R, E, A> {
  readonly _tag = "Blocked"
  constructor(
    readonly blockedRequests: BlockedRequests<R>,
    readonly cont: Continue<R, E, A>
  ) {}
}

export class Done<A> {
  readonly _tag = "Done"
  constructor(readonly value: A) {}
}

export class Fail<E> {
  readonly _tag = "Fail"
  constructor(readonly cause: Cause<E>) {}
}

/**
 * @tsplus type effect/query/Result.Ops
 */
export interface ResultOps {
  readonly $: ResultAspects
}
export const Result: ResultOps = {
  $: {}
}

/**
 * @tsplus type effect/query/Result.Aspects
 */
export interface ResultAspects {}

/**
 * @tsplus unify effect/query/Result
 */
export function unifyResult<X extends Result<any, any, any>>(self: X): Result<
  [X] extends [Result<infer R, any, any>] ? R : never,
  [X] extends [Result<any, infer E, any>] ? E : never,
  [X] extends [Result<any, any, infer A>] ? A : never
> {
  return self
}
Either
/**
 * Constructs a result that is blocked on the specified requests with the
 * specified continuation.
 *
 * @tsplus static effect/query/Result.Ops blocked
 */
export function blocked<R, E, A>(
  blockedRequests: BlockedRequests<R>,
  cont: Continue<R, E, A>
): Result<R, E, A> {
  return new Blocked(blockedRequests, cont)
}

/**
 * Constructs a result that is done with the specified value.
 *
 * @tsplus static effect/query/Result.Ops done
 */
export function done<A>(value: A): Result<never, never, A> {
  return new Done(value)
}

/**
 * Constructs a result that is failed with the specified `Cause`.
 *
 * @tsplus static effect/query/Result.Ops fail
 */
export function fail<E>(cause: Cause<E>): Result<never, E, never> {
  return new Fail(cause)
}

/**
 * Lifts an `Either` into a result.
 *
 * @tsplus static effect/query/Result.Ops fromEither
 */
export function fromEither<E, A>(either: Either<E, A>): Result<never, E, A> {
  switch (either._tag) {
    case "Left": {
      return Result.fail(Cause.fail(either.left))
    }
    case "Right": {
      return Result.done(either.right)
    }
  }
}

/**
 * Lifts an `Exit` into a result.
 *
 * @tsplus static effect/query/Result.Ops fromExit
 */
export function fromExit<E, A>(exit: Exit<E, A>): Result<never, E, A> {
  switch (exit._tag) {
    case "Failure": {
      return Result.fail(exit.cause)
    }
    case "Success": {
      return Result.done(exit.value)
    }
  }
}
