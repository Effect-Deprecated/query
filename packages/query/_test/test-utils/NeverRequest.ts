/**
 * @tsplus type effect/query/test/NeverRequest
 */
export interface NeverRequest extends Request<never, never> {}

/**
 * @tsplus type effect/query/test/NeverRequest.Ops
 */
export interface NeverRequestOps extends Request.Constructor<NeverRequest, never, never, never> {}
export const NeverRequest: NeverRequestOps = Request.of<NeverRequest>()

/**
 * @tsplus static effect/query/test/NeverRequest.Ops neverQuery
 */
export const neverQuery: Query<never, never, never> = Query.fromRequest(
  NeverRequest({}),
  DataSource.never
)
