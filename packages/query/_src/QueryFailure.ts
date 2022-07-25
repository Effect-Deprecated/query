export const QueryFailureSym = Symbol.for("@effect/query/QueryFailure")
export type QueryFailureSym = typeof QueryFailureSym

/**
 * @tsplus type effect/query/QueryFailure
 */
export interface QueryFailure extends Case {
  readonly _tag: "QueryFailure"
  readonly dataSource: DataSource<any, any>
  readonly request: Request<any, any>
}

/**
 * @tsplus type effect/query/QueryFailure.Ops
 */
export interface QueryFailureOps extends Case.Constructor<QueryFailure, "_tag"> {}
export const QueryFailure: QueryFailureOps = Case.tagged<QueryFailure>("QueryFailure")

/**
 * @tsplus getter effect/query/QueryFailure message
 */
export function message(self: QueryFailure): string {
  const dataSourceId = self.dataSource.identifier
  if (Object.prototype.hasOwnProperty.call(self.request, "_tag")) {
    const requestId = (self.request as any)._tag
    return `Data source ${dataSourceId} did not complete request ${requestId}.`
  }
  return `Data source ${dataSourceId} did not complete request.`
}

/**
 * @tsplus static effect/query/QueryFailure.Ops is
 */
export function isQueryFailure(u: unknown): u is QueryFailure {
  return typeof u === "object" && u != null && QueryFailureSym in u
}
