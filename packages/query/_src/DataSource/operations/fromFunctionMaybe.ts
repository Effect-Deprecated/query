/**
 * Constructs a data source from a pure function that may not provide results
 * for all requests received.
 *
 * @tsplus static effect/query/DataSource.Ops fromFunctionMaybe
 */
export function fromFunctionMaybe<A extends Request<any, any>>(
  name: string,
  f: (a: A) => Maybe<Request.GetA<A>>
): DataSource<never, A> {
  return DataSource.fromFunctionMaybeEffect(name, a => Effect.succeedNow(f(a)))
}
