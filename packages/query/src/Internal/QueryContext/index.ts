// ets_tracing: off

// port as of: https://github.com/zio/zio-query/blob/249ad1e67ff85db67250ec9d753b0aad5d669021/zio-query/shared/src/main/scala/zio/query/ZQuery.scala
import type { Cache } from "../../Cache/index.js"

/**
 * `QueryContext` maintains the context of a query. Currently `QueryContext`
 * simply maintains a `Cache` of requests and results but this will be
 * augmented with other functionality such as logging and metrics in the
 * future.
 */
export interface QueryContext {
  cache: Cache
}
