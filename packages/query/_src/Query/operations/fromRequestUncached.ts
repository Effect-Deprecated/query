/**
 * Constructs a query from a request and a data source but does not apply
 * caching to the query.
 *
 * @tsplus static effect/query/Query.Ops fromRequestUncached
 */
export function fromRequestUncached<R, A extends Request<any, any>>(
  request: LazyArg<A>,
  dataSource: LazyArg<DataSource<R, A>>
): Query<R, Request.GetE<A>, Request.GetA<A>> {
  return Query.fromRequest(request, dataSource).uncached
}
