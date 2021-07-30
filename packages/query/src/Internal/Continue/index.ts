// ets_tracing: off

// port of: https://github.com/zio/zio-query/blob/5746d54dfbed8e3c35415355b09c8e6a54c49889/zio-query/shared/src/main/scala/zio/query/internal/Continue.scala
import type { IO } from "@effect-ts/core/Effect"
import * as T from "@effect-ts/core/Effect"
import { _A, _E, _R } from "@effect-ts/core/Effect"
import type * as E from "@effect-ts/core/Either"
import { pipe } from "@effect-ts/core/Function"
import * as O from "@effect-ts/core/Option"
import type { _A as _GetA, _E as _GetE } from "@effect-ts/core/Utils"
import type * as C from "@effect-ts/system/Cause"
import * as REF from "@effect-ts/system/Ref"

import type { DataSource } from "../../DataSource"
import type { DataSourceAspect } from "../../DataSourceAspect"
import * as Q from "../../Query"
import { QueryFailure } from "../../QueryFailure"
import type { Request } from "../../Request"
import type { QueryContext } from "../QueryContext"

class Effect<R, E, A> {
  readonly _tag = "Effect";
  readonly [_R]!: (r: R) => never;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

  constructor(public readonly query: Q.Query<R, E, A>) {}
}

class Get<E, A> {
  readonly _tag = "Get";
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

  constructor(public readonly io: IO<E, A>) {}
}

/**
 * A `Continue[R, E, A]` models a continuation of a blocked request that
 * requires an environment `R` and may either fail with an `E` or succeed with
 * an `A`. A continuation may either be a `Get` that merely gets the result of
 * a blocked request (potentially transforming it with pure functions) or an
 * `Effect` that may perform arbitrary effects. This is used by the library
 * internally to determine whether it is safe to pipeline two requests that
 * must be executed sequentially.
 */
export type Continue<R, E, A> = Effect<R, E, A> | Get<E, A>

/**
 * Constructs a continuation from a request, a data source, and a `Ref` that
 * will contain the result of the request when it is executed.
 */
export function apply<R, A extends Request<any, any>>(
  request: A,
  dataSource: DataSource<R, A>,
  ref: REF.Ref<O.Option<E.Either<_GetE<A>, _GetA<A>>>>
): Continue<R, _GetE<A>, _GetA<A>> {
  return pipe(
    REF.get(ref),
    T.chain((v) =>
      O.fold_(
        v,
        () => T.die(new QueryFailure(dataSource, request)),
        (b) => T.fromEither(() => b)
      )
    ),
    get
  )
}

/**
 * Constructs a continuation that may perform arbitrary effects.
 */
export function effect<R, E, A>(query: Q.Query<R, E, A>): Continue<R, E, A> {
  return new Effect(query)
}

/**
 * Constructs a continuation that merely gets the result of a blocked request
 * (potentially transforming it with pure functions).
 */
export function get<E, A>(io: IO<E, A>): Continue<unknown, E, A> {
  return new Get(io)
}

/**
 * Purely folds over the failure and success types of this continuation.
 */
export function fold<E, A, B>(
  failure: (e: E) => B,
  success: (a: A) => B
): <R>(cont: Continue<R, E, A>) => Continue<R, never, B> {
  return (cont) => {
    switch (cont._tag) {
      case "Effect":
        return effect(Q.fold_(cont.query, failure, success))
      case "Get":
        return get(T.fold_(cont.io, failure, success))
    }
  }
}

/**
 * Effectually folds over the failure and success types of this continuation.
 */
export function foldCauseM<E, A, R2, E2, A2, R3, E3, A3>(
  failure: (cause: C.Cause<E>) => Q.Query<R2, E2, A2>,
  success: (a: A) => Q.Query<R3, E3, A3>
) {
  return <R>(self: Continue<R, E, A>): Continue<R & R2 & R3, E2 | E3, A2 | A3> =>
    foldCauseM_(self, failure, success)
}

export function foldCauseM_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Continue<R, E, A>,
  failure: (cause: C.Cause<E>) => Q.Query<R2, E2, A2>,
  success: (a: A) => Q.Query<R3, E3, A3>
): Continue<R & R2 & R3, E2 | E3, A2 | A3> {
  switch (self._tag) {
    case "Effect":
      return effect(Q.foldCauseM_(self.query, failure, success))
    case "Get":
      return effect(Q.foldCauseM_(Q.fromEffect(self.io), failure, success))
  }
}

/**
 * Purely maps over the success type of this continuation.
 */
export function map<A, B>(
  f: (a: A) => B
): <R, E>(self: Continue<R, E, A>) => Continue<R, E, B> {
  return (self) => {
    switch (self._tag) {
      case "Effect":
        return effect(pipe(self.query, Q.map(f)))
      case "Get":
        return get(T.map_(self.io, f))
    }
  }
}
export function map_<R, E, A, B>(
  self: Continue<R, E, A>,
  f: (a: A) => B
): Continue<R, E, B> {
  return map(f)(self)
}

/**
 * Transforms all data sources with the specified data source aspect.
 */
export function mapDataSources_<R1, R, E, A>(
  self: Continue<R, E, A>,
  f: DataSourceAspect<R1>
): Continue<R & R1, E, A> {
  switch (self._tag) {
    case "Effect":
      return effect(Q.mapDataSources_(self.query, f))
    case "Get":
      return get(self.io)
  }
}

/**
 * Transforms all data sources with the specified data source aspect.
 */
export function mapDataSources<R1 extends R, R>(
  f: DataSourceAspect<R1>
): <E, A>(self: Continue<R, E, A>) => Continue<R1, E, A> {
  return (self) => {
    switch (self._tag) {
      case "Effect":
        return effect(Q.mapDataSources_(self.query, f))
      case "Get":
        return get(self.io)
    }
  }
}

/**
 * Purely maps over the failure type of this continuation.
 */
export function mapError<E, E1>(
  f: (e: E) => E1
): <R, A>(self: Continue<R, E, A>) => Continue<R, E1, A> {
  return (self) => {
    switch (self._tag) {
      case "Effect":
        return effect(Q.mapError(f)(self.query))
      case "Get":
        return get(T.mapError_(self.io, f))
    }
  }
}

/**
 * Effectually maps over the success type of this continuation.
 */
export function mapM<A, R1, E1, B>(
  f: (a: A) => Q.Query<R1, E1, B>
): <R, E>(self: Continue<R, E, A>) => Continue<R1 & R, E1 | E, B> {
  return (self) => {
    switch (self._tag) {
      case "Effect":
        return effect(Q.chain_(self.query, f))
      case "Get":
        return effect(Q.chain_(Q.fromEffect(self.io), f))
    }
  }
}

/**
 * Purely contramaps over the environment type of this continuation.
 */
export function provideSome<R0, R>(
  description: string,
  f: (a: R0) => R
): <E, A>(self: Continue<R, E, A>) => Continue<R0, E, A> {
  return (self) => {
    switch (self._tag) {
      case "Effect":
        return effect(Q.provideSome(description, f)(self.query))
      case "Get":
        return get(self.io)
    }
  }
}

/**
 * Combines this continuation with that continuation using the specified
 * function, in sequence.
 */
export function zipWith<R1, E1, B, A, C>(
  that: Continue<R1, E1, B>,
  f: (a: A, b: B) => C
) {
  return <R, E>(self: Continue<R, E, A>): Continue<R & R1, E | E1, C> => {
    switch (self._tag) {
      case "Effect":
        switch (that._tag) {
          case "Effect":
            return effect(Q.zipWith(that.query, f)(self.query))
          case "Get":
            return effect(Q.zipWith(Q.fromEffect(that.io), f)(self.query))
        }
      case "Get":
        switch (that._tag) {
          case "Effect":
            return effect(Q.zipWith(that.query, f)(Q.fromEffect(self.io)))
          case "Get":
            return get(T.zipWith_(self.io, that.io, f))
        }
    }
  }
}

/**
 * Combines this continuation with that continuation using the specified
 * function, in parallel.
 */
export function zipWithPar<R1, E1, B, A, C>(
  that: Continue<R1, E1, B>,
  f: (a: A, b: B) => C
) {
  return <R, E>(self: Continue<R, E, A>): Continue<R & R1, E | E1, C> => {
    switch (self._tag) {
      case "Effect":
        switch (that._tag) {
          case "Effect":
            return effect(Q.zipWithPar(that.query, f)(self.query))
          case "Get":
            return effect(Q.zipWith(Q.fromEffect(that.io), f)(self.query))
        }
      case "Get":
        switch (that._tag) {
          case "Effect":
            return effect(Q.zipWith(that.query, f)(Q.fromEffect(self.io)))
          case "Get":
            return get(T.zipWith_(self.io, that.io, f))
        }
    }
  }
}

/**
 * Runs this continuation..
 */
export function runContext(
  queryContext: QueryContext
): <R, E, A>(self: Continue<R, E, A>) => T.Effect<R, E, A> {
  return (self) => {
    switch (self._tag) {
      case "Effect":
        return Q.runContext(queryContext)(self.query)
      case "Get":
        return self.io
    }
  }
}
