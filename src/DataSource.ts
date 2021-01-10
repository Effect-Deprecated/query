import * as A from "@effect-ts/core/Classic/Array";
import * as T from "@effect-ts/core/Effect";
import { CompletedRequestMap } from "./CompletedRequestMap";
import { Described } from "./Described";

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
  readonly _tag = "DataSource";
  readonly _R!: (r: R) => void;
  readonly _A!: (a: A) => void;

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
    ) => T.Effect<R, never, CompletedRequestMap>
  ) {}
}

/**
 * Returns a data source that executes at most `n` requests in parallel.
 */
export function batchN(n: number) {
  return <R, A>(self: DataSource<R, A>): DataSource<R, A> =>
    new DataSource(`${self.identifier}.batchN(${n})`, (requests) => {
      if (n < 1) {
        return T.die("batchN: n must be at least 1"); // TODO: Error class
      } else {
        return self.runAll(
          A.reduce_(requests, A.empty as A.Array<A.Array<A>>, (x, y) =>
            A.concat_(x, A.chunksOf_(y, n))
          )
        );
      }
    });
}

/**
 * Returns a new data source that executes requests of type `B` using the
 * specified function to transform `B` requests into requests that this data
 * source can execute.
 */
export function contramap<B, A>(f: Described<(a: B) => A>) {
  return <R>(self: DataSource<R, A>): DataSource<R, B> =>
    new DataSource(
      `${self.identifier}.contramap(${f.description})`,
      (requests) => self.runAll(A.map_(requests, (_) => A.map_(_, f.value)))
    );
}

/**
 * Returns a new data source that executes requests of type `B` using the
 * specified effectual function to transform `B` requests into requests that
 * this data source can execute.
 */
export function contramapM<R1, B, A>(
  f: Described<(b: B) => T.Effect<R1, never, A>>
) {
  return <R>(self: DataSource<R, A>): DataSource<R & R1, B> =>
    new DataSource(
      `${self.identifier}.contramapM(${f.description})`,
      (requests) =>
        T.chain_(
          T.foreach_(requests, (_) => T.foreachPar_(_, f.value)),
          self.runAll
        )
    );
}
