// port of: https://github.com/zio/zio-query/blob/5746d54dfbed8e3c35415355b09c8e6a54c49889/zio-query/shared/src/main/scala/zio/query/ZQuery.scala
import * as T from "@effect-ts/core/Effect";
import { Has } from "@effect-ts/core/Has";
import { QueryContext } from "./internal/QueryContext";
import * as RES from "./internal/Result";
import * as CONT from "./internal/Continue";

/**
 * A `ZQuery[R, E, A]` is a purely functional description of an effectual query
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
 * {{{
 * val getAllUserIds: ZQuery[Any, Nothing, List[Int]]         = ???
 * def getUserNameById(id: Int): ZQuery[Any, Nothing, String] = ???
 *
 * for {
 *   userIds   <- getAllUserIds
 *   userNames <- ZQuery.foreachPar(userIds)(getUserNameById)
 * } yield userNames
 * }}}
 *
 * This would normally require N + 1 queries, one for `getAllUserIds` and one
 * for each call to `getUserNameById`. In contrast, `ZQuery` will automatically
 * optimize this to two queries, one for `userIds` and one for `userNames`,
 * assuming an implementation of the user service that supports batching.
 *
 * Based on "There is no Fork: an Abstraction for Efficient, Concurrent, and
 * Concise Data Access" by Simon Marlow, Louis Brandy, Jonathan Coens, and Jon
 * Purdy. [[http://simonmar.github.io/bib/papers/haxl-icfp14.pdf]]
 */
export class Query<R, E, A> {
  readonly _tag = "Query";
  readonly _R!: (r: R) => void;
  readonly _E!: () => E;
  readonly _A!: () => A;

  constructor(
    public readonly step: T.Effect<
      R & Has<QueryContext>,
      E,
      RES.Result<R, E, A>
    >
  ) {}
}

/**
 * Returns a query that models execution of this query, followed by passing
 * its result to the specified function that returns a query. Requests
 * composed with `flatMap` or combinators derived from it will be executed
 * sequentially and will not be pipelined, though deduplication and caching of
 * requests may still be applied.
 */
export function chain<R1, E1, A, B>(
  f: (a: A) => Query<R1, E1, B>
): <R, E>(self: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (self) =>
    new Query(
      T.chain_(self.step, (r) => {
        switch (r._tag) {
          case "Blocked":
            return T.succeed(RES.blocked(r.blockedRequests, CONT.mapM(f)));
          case "Done":
            return f(r.value).step;
          case "Fail":
            return T.succeed(RES.fail(r.cause));
        }
      })
    );
}
