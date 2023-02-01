/**
 * @since 1.0.0
 */
import type * as DataSource from "@effect/query/DataSource"
import * as internal from "@effect/query/internal_effect_untraced/queryFailure"
import type * as Request from "@effect/query/Request"

/**
 * @since 1.0.0
 * @category symbols
 */
export const QueryFailureTypeId: unique symbol = internal.QueryFailureTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type QueryFailureTypeId = typeof QueryFailureTypeId

/**
 * A `QueryFailure` keeps track of details relevant to query failures.
 *
 * @since 1.0.0
 * @category models
 */
export interface QueryFailure {
  readonly [QueryFailureTypeId]: QueryFailureTypeId
  readonly _tag: "QueryFailure"
  readonly dataSource: DataSource.DataSource<unknown, unknown>
  readonly request: Request.Request<unknown, unknown>
  message(): string
}

/**
 * Returns `true` if the specified value is a `QueryFailure`, `false` otherwise.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isQueryFailure: (u: unknown) => u is QueryFailure = internal.isQueryFailure

/**
 * Constructs a new `QueryFailure` from the specified data source and request.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  dataSource: DataSource.DataSource<unknown, unknown>,
  request: Request.Request<unknown, unknown>
) => QueryFailure = internal.make
