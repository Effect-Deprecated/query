import { IO } from "@effect-ts/core/Effect";
import * as T from "@effect-ts/core/Effect";
import * as REF from "@effect-ts/system/Ref";
import * as O from "@effect-ts/core/Classic/Option";
import * as E from "@effect-ts/core/Classic/Either";
import { pipe } from "@effect-ts/core/Function";
import { Query } from "src/Query";
import { DataSource } from "src/DataSource";
import { QueryFailure } from "src/QueryFailure";
import { Request } from "src/Request";
import { _A, _E } from "@effect-ts/core/Utils";

class Effect<R, E, A> {
  readonly _tag = "Effect";
  readonly _R!: (r: R) => never;
  readonly _E!: () => E;
  readonly _A!: () => A;

  constructor(public readonly query: Query<R, E, A>) {}
}

class Get<E, A> {
  readonly _tag = "Get";
  readonly _E!: () => E;
  readonly _A!: () => A;

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
export type Continue<R, E, A> = Effect<R, E, A> | Get<E, A>;

/**
 * Constructs a continuation from a request, a data source, and a `Ref` that
 * will contain the result of the request when it is executed.
 */
export function apply<R, A extends Request<any, any>>(
  request: A,
  dataSource: DataSource<R, A>,
  ref: REF.Ref<O.Option<E.Either<_E<A>, _A<A>>>>
): Continue<R, _E<A>, _A<A>> {
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
  );
}

/**
 * Constructs a continuation that may perform arbitrary effects.
 */
export function effect<R, E, A>(query: Query<R, E, A>): Continue<R, E, A> {
  return new Effect(query);
}

/**
 * Constructs a continuation that merely gets the result of a blocked request
 * (potentially transforming it with pure functions).
 */
export function get<E, A>(io: IO<E, A>): Continue<unknown, E, A> {
  return new Get(io);
}

/**
 * Purely folds over the failure and success types of this continuation.
 */
export function fold<E, A, B>(
  failure: (e: E) => B,
  success: (a: A) => B
): <R>(cont: Continue<R, E, A>) => Continue<R, never, B> {
  // @ts-expect-error
  return (cont) => {
    switch (cont._tag) {
      case "Effect":
        // @ts-expect-error
        return effect();
    }
  };
}
