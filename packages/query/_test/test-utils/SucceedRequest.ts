/**
 * @tsplus type effect/query/test/SucceedRequest
 */
export interface SucceedRequest extends Request<never, void> {
  readonly deferred: Deferred<never, void>
}

/**
 * @tsplus type effect/query/test/SucceedRequest.Ops
 */
export interface SucceedRequestOps
  extends Request.Constructor<SucceedRequest, never, void, never>
{}
export const SucceedRequest: SucceedRequestOps = Request.of<SucceedRequest>()

/**
 * @tsplus static effect/query/test/SucceedRequest.Ops DataSource
 */
export const SucceedDataSource: DataSource<never, SucceedRequest> = DataSource.fromFunctionEffect(
  "succeed",
  (request) => request.deferred.succeed(undefined).unit
)

/**
 * @tsplus static effect/query/test/SucceedRequest.Ops succeedQuery
 */
export function succeedQuery(deferred: Deferred<never, void>): Query<never, never, void> {
  return Query.fromRequest(SucceedRequest({ deferred }), SucceedRequest.DataSource)
}
