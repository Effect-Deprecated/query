// tracing: off

// port of: https://github.com/zio/zio-query/blob/3f9f4237ca2d879b629163f23fe79045eb29f0b0/zio-query/shared/src/main/scala/zio/query/DataSource.scala
import "@effect-ts/system/Operator"

import * as A from "@effect-ts/core/Collections/Immutable/Array"
import * as T from "@effect-ts/core/Effect"
import * as E from "@effect-ts/core/Either"
import { tuple } from "@effect-ts/core/Function"
import type * as O from "@effect-ts/core/Option"
import * as St from "@effect-ts/core/Structural"
import type { _A, _E } from "@effect-ts/core/Utils"

import * as CR from "../CompletedRequestMap"
import type { Request } from "../Request"

/**
 * A `DataSource[R, A]` requires an environment `R` and is capable of executing
 * requests of type `A`.
 *
 * Data sources must implement the method `runAll` which takes a collection of
 * requests and returns an effect with a `CompletedRequestMap` containing a
 * mapping from requests to results. The type of the collection of requests is
 * a `Chunk[Chunk[A]]`. The outer `Chunk` represents batches of requests that
 * must be performed sequentially. The inner `Chunk` represents a batch of
 * requests that can be performed in parallel. This allows data sources to
 * introspect on all the requests being executed and optimize the query.
 *
 * Data sources will typically be parameterized on a subtype of `Request[A]`,
 * though that is not strictly necessarily as long as the data source can map
 * the request type to a `Request[A]`. Data sources can then pattern match on
 * the collection of requests to determine the information requested, execute
 * the query, and place the results into the `CompletedRequestsMap` using
 * [[CompletedRequestMap.empty]] and [[CompletedRequestMap.insert]]. Data
 * sources must provide results for all requests received. Failure to do so
 * will cause a query to die with a `QueryFailure` when run.
 */
export class DataSource<R, A> {
  readonly _tag = "DataSource"

  constructor(
    /**
     * The data source's identifier.
     */
    public readonly identifier: string,
    /**
     * Execute a collection of requests. The outer `Chunk` represents batches
     * of requests that must be performed sequentially. The inner `Chunk`
     * represents a batch of requests that can be performed in parallel.
     */
    public readonly runAll: (
      requests: A.Array<A.Array<A>>
    ) => T.Effect<R, never, CR.CompletedRequestMap>
  ) {}

  [St.equalsSym](that: unknown): boolean {
    return that instanceof DataSource && this.identifier === that.identifier
  }

  [St.hashSym](): number {
    return St.hashString(this.identifier)
  }
}

export function equals<R, A>(a: DataSource<R, A>, b: DataSource<R, A>): boolean {
  return a.identifier === b.identifier
}

export function hash(a: DataSource<any, any>): number {
  return St.hashString(a.identifier)
}

export class InvalidBatchConfig {
  readonly _tag = "InvalidBatchConfig"
  readonly message = "batchN: n must be at least 1 and must be an integer"
  constructor(readonly n: number) {}
}

/**
 * Returns a data source that executes at most `n` requests in parallel.
 */
export function batchN_<R, A>(self: DataSource<R, A>, n: number): DataSource<R, A> {
  return new DataSource(`${self.identifier}.batchN(${n})`, (requests) => {
    if (n < 1 || !Number.isInteger(n)) {
      return T.die(new InvalidBatchConfig(n))
    } else {
      return self.runAll(
        A.reduce_(requests, A.emptyOf<A.Array<A>>(), (x, y) =>
          A.concat_(x, A.chunksOf_(y, n))
        )
      )
    }
  })
}

/**
 * Returns a data source that executes at most `n` requests in parallel.
 * @dataFirst batchN_
 */
export function batchN(n: number) {
  return <R, A>(self: DataSource<R, A>): DataSource<R, A> => batchN_(self, n)
}

/**
 * Returns a new data source that executes requests of type `B` using the
 * specified function to transform `B` requests into requests that this data
 * source can execute.
 */
export function contramap_<R, A, B>(
  self: DataSource<R, A>,
  description: string,
  f: (a: B) => A
): DataSource<R, B> {
  return new DataSource(`${self.identifier}.contramap(${description})`, (requests) =>
    self.runAll(A.map_(requests, (_) => A.map_(_, f)))
  )
}

/**
 * Returns a new data source that executes requests of type `B` using the
 * specified function to transform `B` requests into requests that this data
 * source can execute.
 * @dataFirst contramap_
 */
export function contramap<B, A>(description: string, f: (a: B) => A) {
  return <R>(self: DataSource<R, A>): DataSource<R, B> =>
    contramap_(self, description, f)
}

/**
 * Returns a new data source that executes requests of type `B` using the
 * specified effectual function to transform `B` requests into requests that
 * this data source can execute.
 */
export function contramapM_<R, A, B, R1>(
  self: DataSource<R, A>,
  description: string,
  f: (b: B) => T.Effect<R1, never, A>
): DataSource<R & R1, B> {
  return new DataSource(`${self.identifier}.contramapM(${description})`, (requests) =>
    T.chain_(
      T.forEach_(requests, (_) => T.forEachPar_(_, f)),
      self.runAll
    )
  )
}

/**
 * Returns a new data source that executes requests of type `B` using the
 * specified effectual function to transform `B` requests into requests that
 * this data source can execute.
 * @dataFirst contramapM_
 */
export function contramapM<R1, B, A>(
  description: string,
  f: (b: B) => T.Effect<R1, never, A>
) {
  return <R>(self: DataSource<R, A>): DataSource<R & R1, B> =>
    contramapM_(self, description, f)
}

/**
 * Returns a new data source that executes requests of type `C` using the
 * specified function to transform `C` requests into requests that either
 * this data source or that data source can execute.
 */
export function eitherWith_<R, A, R1, B, C>(
  self: DataSource<R, A>,
  description: string,
  that: DataSource<R1, B>,
  f: (c: C) => E.Either<A, B>
): DataSource<R & R1, C> {
  return new DataSource<R & R1, C>(
    `${self.identifier}.eitherWith(${that.identifier})(${description})`,
    (requests) =>
      T.map_(
        T.forEach_(requests, (requests) => {
          const { left: as, right: bs } = A.partitionMap_(requests, f)
          return T.zipWithPar_(self.runAll([as]), that.runAll([bs as any]), CR.concat)
        }),
        (_) => A.reduce_(_, CR.empty, CR.concat)
      )
  )
}

/**
 * Returns a new data source that executes requests of type `C` using the
 * specified function to transform `C` requests into requests that either
 * this data source or that data source can execute.
 * @dataFirst eitherWith_
 */
export function eitherWith<C, A, B, R1>(
  description: string,
  that: DataSource<R1, B>,
  f: (c: C) => E.Either<A, B>
) {
  return <R>(self: DataSource<R, A>) => eitherWith_(self, description, that, f)
}

/**
 * Provides this data source with its required environment.
 */
export function provide_<R, A>(
  self: DataSource<R, A>,
  description: string,
  r: R
): DataSource<unknown, A> {
  return provideSome(`_ => ${description}`, () => r)(self)
}

/**
 * Provides this data source with its required environment.
 * @dataFirst provide_
 */
export function provide<R>(description: string, r: R) {
  return <A>(self: DataSource<R, A>): DataSource<unknown, A> =>
    provide_(self, description, r)
}

/**
 * Provides this data source with part of its required environment.
 */
export function provideSome_<R, A, R0>(
  self: DataSource<R, A>,
  description: string,
  f: (r: R0) => R
): DataSource<R0, A> {
  return new DataSource(`${self.identifier}.provideSome(${description})`, (requests) =>
    T.provideSome_(self.runAll(requests), f)
  )
}

/**
 * Provides this data source with part of its required environment.
 * @dataFirst provideSome_
 */
export function provideSome<R0, R>(description: string, f: (r: R0) => R) {
  return <A>(self: DataSource<R, A>): DataSource<R0, A> =>
    provideSome_(self, description, f)
}

/**
 * Returns a new data source that executes requests by sending them to this
 * data source and that data source, returning the results from the first
 * data source to complete and safely interrupting the loser.
 */
export function race_<R, A, R1, A1>(
  self: DataSource<R, A>,
  that: DataSource<R1, A1>
): DataSource<R & R1, A & A1> {
  return new DataSource(`${self.identifier}.race(${that.identifier})`, (requests) =>
    T.race_(self.runAll(requests), that.runAll(requests))
  )
}

/**
 * Returns a new data source that executes requests by sending them to this
 * data source and that data source, returning the results from the first
 * data source to complete and safely interrupting the loser.
 * @dataFirst race_
 */
export function race<R1, A1>(that: DataSource<R1, A1>) {
  return <R, A>(self: DataSource<R, A>): DataSource<R & R1, A & A1> => race_(self, that)
}

/**
 * A data source that executes requests that can be performed in parallel in
 * batches but does not further optimize batches of requests that must be
 * performed sequentially.
 */
export function makeBatched(identifier: string) {
  return <R, A>(
    run: (requests: A.Array<A>) => T.Effect<R, never, CR.CompletedRequestMap>
  ): DataSource<R, A> =>
    new DataSource(identifier, (requests) =>
      T.reduce_(requests, CR.empty, (crm, requests) => {
        const newRequests = A.filter_(requests, (e) => !CR.contains_(crm, e))
        return A.isEmpty(newRequests)
          ? T.succeed(crm)
          : T.map_(run(newRequests), (_) => CR.concat(crm, _))
      })
    )
}

/**
 * Constructs a data source from a pure function.
 */
export function fromFunction(identifier: string) {
  return <A extends Request<never, any>>(f: (a: A) => _A<A>): DataSource<unknown, A> =>
    makeBatched(identifier)((requests) =>
      T.succeed(
        A.reduce_(requests, CR.empty, (crm, k) => CR.insert_(crm, k, E.right(f(k))))
      )
    )
}

/**
 * Constructs a data source from a pure function that takes a list of
 * requests and returns a list of results of the same size. Each item in the
 * result list must correspond to the item at the same index in the request
 * list.
 */
export function fromFunctionBatched(identifier: string) {
  return <A extends Request<any, any>>(
    f: (a: A.Array<A>) => A.Array<_A<A>>
  ): DataSource<unknown, A> =>
    fromFunctionBatchedM(identifier)((as) => T.succeed(f(as)))
}
/**
 * Constructs a data source from an effectual function that takes a list of
 * requests and returns a list of results of the same size. Each item in the
 * result list must correspond to the item at the same index in the request
 * list.
 */
export function fromFunctionBatchedM(identifier: string) {
  return <R, A extends Request<any, any>>(
    f: (a: A.Array<A>) => T.Effect<R, _E<A>, A.Array<_A<A>>>
  ): DataSource<R, A> =>
    makeBatched(identifier)((requests) => {
      const a: T.Effect<
        R,
        never,
        A.Array<readonly [A, E.Either<_E<A>, _A<A>>]>
      > = T.fold_(
        f(requests),
        (e) => A.map_(requests, (_) => tuple(_, E.left(e))),
        (bs) =>
          A.zip_(
            requests,
            A.map_(bs, (_) => E.right(_))
          )
      )
      return T.map_(a, (_) =>
        A.reduce_(_, CR.empty, (crm, [k, v]) => CR.insert_(crm, k, v))
      )
    })
}

/**
 * Constructs a data source from a pure function that takes a list of
 * requests and returns a list of optional results of the same size. Each
 * item in the result list must correspond to the item at the same index in
 * the request list.
 */
export function fromFunctionBatchedOption(identifier: string) {
  return <A extends Request<never, any>>(
    f: (a: A.Array<A>) => A.Array<O.Option<_A<A>>>
  ): DataSource<unknown, A> =>
    fromFunctionBatchedOptionM(identifier)((as) => T.succeed(f(as)))
}

/**
 * Constructs a data source from an effectual function that takes a list of
 * requests and returns a list of optional results of the same size. Each
 * item in the result list must correspond to the item at the same index in
 * the request list.
 */
export function fromFunctionBatchedOptionM(identifier: string) {
  return <A extends Request<any, any>, E, R>(
    f: (a: A.Array<A>) => T.Effect<R, E, A.Array<O.Option<_A<A>>>>
  ): DataSource<R, A> =>
    makeBatched(identifier)((requests) => {
      const a: T.Effect<
        R,
        never,
        A.Array<readonly [A, E.Either<E, O.Option<_A<A>>>]>
      > = T.fold_(
        f(requests),
        (e) => A.map_(requests, (_) => tuple(_, E.left(e))),
        (bs) =>
          A.zip_(
            requests,
            A.map_(bs, (_) => E.right(_))
          )
      )
      return T.map_(a, (_) =>
        A.reduce_(_, CR.empty, (crm, [k, v]) => CR.insertOption_(crm, k, v))
      )
    })
}
