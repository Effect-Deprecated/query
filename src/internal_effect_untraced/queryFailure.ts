import type * as DataSource from "@effect/query/DataSource"
import type * as QueryFailure from "@effect/query/QueryFailure"
import type * as Request from "@effect/query/Request"

/** @internal */
const QueryFailureSymbolKey = "@effect/query/QueryFailure"

/** @internal */
export const QueryFailureTypeId: QueryFailure.QueryFailureTypeId = Symbol.for(
  QueryFailureSymbolKey
) as QueryFailure.QueryFailureTypeId

class QueryFailureImpl implements QueryFailure.QueryFailure {
  readonly [QueryFailureTypeId]: QueryFailure.QueryFailureTypeId = QueryFailureTypeId
  readonly _tag = "QueryFailure"
  constructor(
    readonly dataSource: DataSource.DataSource<unknown, unknown>,
    readonly request: Request.Request<unknown, unknown>
  ) {}
  message() {
    return this.toString()
  }
  toJSON() {
    if ("_tag" in this.request) {
      return {
        _tag: "QueryFailure",
        request: this.request._tag
      }
    }
    return {
      _tag: "QueryFailure"
    }
  }
  toString() {
    if ("_tag" in this.request) {
      const requestId = this.request._tag
      return `Data source did not complete request ${requestId}`
    }
    return `Data source did not complete request`
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toJSON()
  }
}

/** @internal */
export const isQueryFailure = (u: unknown): u is QueryFailure.QueryFailure =>
  typeof u === "object" && u != null && QueryFailureTypeId in u

/** @internal */
export const make = (
  dataSource: DataSource.DataSource<unknown, unknown>,
  request: Request.Request<unknown, unknown>
): QueryFailure.QueryFailure => new QueryFailureImpl(dataSource, request)
