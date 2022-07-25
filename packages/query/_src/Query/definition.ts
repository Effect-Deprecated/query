export const QuerySym = Symbol.for("@effect/query/Query")
export type QuerySym = typeof QuerySym

export const _R = Symbol.for("@effect/query/Query.R")
export type _R = typeof _R

export const _E = Symbol.for("@effect/query/Query.E")
export type _E = typeof _E

export const _A = Symbol.for("@effect/query/Query.A")
export type _A = typeof _A

/**
 * A `Query<R, E, A>` is a purely functional description of an effectual query
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
 * ```ts
 * import * as C from "@tsplus/stdlib/collections/Chunk"
 * import * as Q from "@effect/query/Query"
 *
 * declare const getAllUserIds: Q.Query<never, never, C.Chunk<number>>
 * declare const getUserNameById: (id: number) => Q.Query<never, never, string>
 *
 * const userNames = pipe(
 *   getAllUserIds,
 *   Q.flatMap((userIds) => Q.forEachPar(userIds, getUserNameById))
 * )
 * ```
 *
 * This would normally require N + 1 queries, one for `getAllUserIds` and one
 * for each call to `getUserNameById`. In contrast, `Query` will automatically
 * optimize this to two queries, one for `userIds` and one for `userNames`,
 * assuming an implementation of the user service that supports batching.
 *
 * Based on "There is no Fork: an Abstraction for Efficient, Concurrent, and
 * Concise Data Access" by Simon Marlow, Louis Brandy, Jonathan Coens, and Jon
 * Purdy. {@link http://simonmar.github.io/bib/papers/haxl-icfp14.pdf}
 *
 * @tsplus type effect/query/Query
 */
export interface Query<R, E, A> {
  readonly [QuerySym]: QuerySym
  readonly [_R]: () => R
  readonly [_E]: () => E
  readonly [_A]: () => A
}

/**
 * @tsplus type effect/query/Query.Ops
 */
export interface QueryOps {
  readonly $: QueryAspects
}
export const Query: QueryOps = {
  $: {}
}

/**
 * @tsplus type effect/query/Query.Aspects
 */
export interface QueryAspects {}

/**
 * @tsplus unify effect/query/Query
 */
export function unifyQuery<X extends Query<any, any, any>>(
  self: X
): Query<
  [X] extends [{ [_R]: () => infer R }] ? R : never,
  [X] extends [{ [_E]: () => infer E }] ? E : never,
  [X] extends [{ [_A]: () => infer A }] ? A : never
> {
  return self
}
