/**
 * @tsplus type effect/query/test/FooRequest
 */
export interface FooRequest extends Request<never, string> {
  readonly _tag: "FooRequest"
}

/**
 * @tsplus type effect/query/test/FooRequest.Ops
 */
export interface FooRequestOps extends Request.Constructor<FooRequest, never, string, "_tag"> {}
export const FooRequest: FooRequestOps = Request.tagged<FooRequest>("FooRequest")

/**
 * @tsplus static effect/query/test/FooRequest.Ops getFoo
 */
export const getFoo: Query<TestConsole, never, string> = Query.fromRequest(
  FooRequest({}),
  DataSource.fromFunctionEffect(
    "Foo",
    () => TestConsole.printLine("Running foo query").zipRight(Effect.succeed("Foo"))
  )
)
