/**
 * @tsplus type effect/query/test/BarRequest
 */
export interface BarRequest extends Request<never, string> {
  readonly _tag: "BarRequest"
}

/**
 * @tsplus type effect/query/test/BarRequest.Ops
 */
export interface BarRequestOps extends Request.Constructor<BarRequest, never, string, "_tag"> {}
export const BarRequest: BarRequestOps = Request.tagged<BarRequest>("BarRequest")

/**
 * @tsplus static effect/query/test/BarRequest.Ops getBar
 */
export const getBar: Query<TestConsole, never, string> = Query.fromRequest(
  BarRequest({}),
  DataSource.fromFunctionEffect(
    "Bar",
    () => TestConsole.printLine("Running bar query").zipRight(Effect.succeed("Bar"))
  )
)
