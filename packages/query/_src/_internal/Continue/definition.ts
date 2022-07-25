/**
 * A `Continue<R, E, A>` models a continuation of a blocked request that
 * requires an environment `R` and may either fail with an `E` or succeed with
 * an `A`. A continuation may either be a `Get` that merely gets the result of
 * a blocked request (potentially transforming it with pure functions) or an
 * `Effect` that may perform arbitrary effects. This is used by the library
 * internally to determine whether it is safe to pipeline two requests that
 * must be executed sequentially.
 *
 * @tsplus type effect/query/Continue
 */
export type Continue<R, E, A> = Eff<R, E, A> | Get<E, A>

/**
 * @tsplus type effect/query/Continue.Ops
 */
export interface ContinueOps {
  readonly $: ContinueAspects
}
export const Continue: ContinueOps = {
  $: {}
}

/**
 * @tsplus type effect/query/Continue.Aspects
 */
export interface ContinueAspects {}

export class Eff<R, E, A> {
  readonly _tag = "Eff"
  constructor(readonly query: Query<R, E, A>) {}
}

export class Get<E, A> {
  readonly _tag = "Get"
  constructor(readonly io: Effect<never, E, A>) {}
}

/**
 * Constructs a continuation that may perform arbitrary effects.
 *
 * @tsplus static effect/query/Continue.Ops effect
 */
export function effect<R, E, A>(query: Query<R, E, A>): Continue<R, E, A> {
  return new Eff(query)
}

/**
 * Constructs a continuation that merely gets the result of a blocked request
 * (potentially transforming it with pure functions).
 *
 * @tsplus static effect/query/Continue.Ops get
 */
export function get<E, A>(io: Effect<never, E, A>): Continue<never, E, A> {
  return new Get(io)
}
