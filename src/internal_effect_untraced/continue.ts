import * as Effect from "@effect/io/Effect"
import * as Ref from "@effect/io/Ref"
import type * as DataSource from "@effect/query/DataSource"
import * as queryFailure from "@effect/query/internal_effect_untraced/queryFailure"
import type * as Query from "@effect/query/Query"
import type * as Request from "@effect/query/Request"
import type * as Either from "@fp-ts/core/Either"
import * as Option from "@fp-ts/core/Option"

/** @internal */
export const ContinueTypeId: unique symbol = Symbol.for("@effect/query/Continue")

/** @internal */
export type ContinueTypeId = typeof ContinueTypeId

/**
 * A `Continue<R, E, A>` models a continuation of a blocked request that
 * requires an environment `R` and may either fail with an `E` or succeed with
 * an `A`. A continuation may either be a `Get` that merely gets the result of a
 * blocked request (potentially transforming it with pure functions) or an
 * `Effect` that may perform arbitrary effects. This is used by the library
 * internally to determine whether it is safe to pipeline two requests that must
 * be executed sequentially.
 *
 * @internal
 */
export type Continue<R, E, A> = Get<E, A> | Eff<R, E, A>

/** @internal */
export interface Get<E, A> {
  readonly _tag: "Get"
  readonly effect: Effect.Effect<never, E, A>
}

/** @internal */
export interface Eff<R, E, A> {
  readonly _tag: "Eff"
  readonly query: Query.Query<R, E, A>
}

/**
 * Constructs a continuation that may perform arbitrary effects.
 *
 * @internal
 */
export const eff = <R, E, A>(query: Query.Query<R, E, A>): Continue<R, E, A> => ({
  _tag: "Eff",
  query
})

/**
 * Constructs a continuation that merely gets the result of a blocked request
 * (potentially transforming it with pure functions).
 *
 * @internal
 */
export const get = <E, A>(effect: Effect.Effect<never, E, A>): Continue<never, E, A> => ({
  _tag: "Get",
  effect
})

/**
 * Constructs a continuation from a request, a data source, and a `Ref` that
 * will contain the result of the request when it is executed.
 *
 * @internal
 */
export const make = <A extends Request.Request<any, any>, R>(
  request: A,
  dataSource: DataSource.DataSource<R, A>,
  ref: Ref.Ref<Option.Option<Either.Either<Request.Request.Error<A>, Request.Request.Success<A>>>>
): Continue<R, Request.Request.Error<A>, Request.Request.Success<A>> =>
  get(Effect.flatMap(
    Ref.get(ref),
    Option.match(
      () => Effect.die(queryFailure.make(dataSource, request)),
      Effect.fromEither
    )
  ))
