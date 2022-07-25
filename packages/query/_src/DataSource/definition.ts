export const DataSourceSym = Symbol.for("@effect/query/DataSource")
export type DataSourceSym = typeof DataSourceSym

/**
 * A `DataSource<R, A>` requires an environment `R` and is capable of executing
 * requests of type `A`.
 *
 * Data sources must implement the method `runAll` which takes a collection of
 * requests and returns an effect with a `CompletedRequestMap` containing a
 * mapping from requests to results. The type of the collection of requests is
 * a `Chunk<Chunk<A>>`. The outer `Chunk` represents batches of requests that
 * must be performed sequentially. The inner `Chunk` represents a batch of
 * requests that can be performed in parallel. This allows data sources to
 * introspect on all the requests being executed and optimize the query.
 *
 * Data sources will typically be parameterized on a subtype of `Request<A>`,
 * though that is not strictly necessarily as long as the data source can map
 * the request type to a `Request<A>`. Data sources can then pattern match on
 * the collection of requests to determine the information requested, execute
 * the query, and place the results into the `CompletedRequestsMap` using
 * `CompletedRequestMap.empty` and `CompletedRequestMap.insert`. Data
 * sources must provide results for all requests received. Failure to do so
 * will cause a query to die with a `QueryFailure` when run.
 *
 * @tsplus type effect/query/DataSource
 */
export interface DataSource<R, A> extends Equals {
  readonly [DataSourceSym]: DataSourceSym
  /**
   * The data source's identifier.
   */
  readonly identifier: string
  /**
   * Execute a collection of requests. The outer `Chunk` represents batches
   * of requests that must be performed sequentially. The inner `Chunk`
   * represents a batch of requests that can be performed in parallel.
   */
  readonly runAll: (requests: Chunk<Chunk<A>>) => Effect<R, never, CompletedRequestMap>
}

export declare namespace DataSource {
  export interface Batched<R, A> extends DataSource<R, A> {
    readonly run: (requests: Chunk<A>) => Effect<R, never, CompletedRequestMap>
  }
}

/**
 * @tsplus type effect/query/DataSource.Ops
 */
export interface DataSourceOps {
  readonly $: DataSourceAspects
}
export const DataSource: DataSourceOps = {
  $: {}
}

/**
 * @tsplus type effect/query/DataSource.Aspects
 */
export interface DataSourceAspects {}

/**
 * @tsplus static effect/query/DataSource.Ops is
 */
export function isDataSource(u: unknown): u is DataSource<unknown, unknown> {
  return typeof u === "object" && u != null && DataSourceSym in u
}
