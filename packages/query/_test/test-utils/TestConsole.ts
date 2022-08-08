/**
 * @tsplus type effect/query/test/TestConsole
 */
export interface TestConsole {
  readonly lines: Ref<Array<string>>
}

/**
 * @tsplus type effect/query/test/TestConsole.Ops
 */
export interface TestConsoleOps {
  readonly Tag: Tag<TestConsole>
}
export const TestConsole: TestConsoleOps = {
  Tag: Tag<TestConsole>()
}

/**
 * @tsplus static effect/query/test/TestConsole.Ops empty
 */
export const empty = Ref.make<Array<string>>([]).map((lines) => ({
  lines
}))

/**
 * @tsplus static effect/query/test/TestConsole.Ops live
 */
export const live = Layer.fromEffect(TestConsole.Tag, TestConsole.empty)

/**
 * @tsplus static effect/query/test/TestConsole.Ops printLine
 */
export function printLine(line: string): Effect<TestConsole, never, void> {
  return Effect.serviceWithEffect(
    TestConsole.Tag,
    (console) => console.lines.update((lines) => [...lines, line])
  )
}

/**
 * @tsplus static effect/query/test/TestConsole.Ops output
 */
export const output: Effect<TestConsole, never, Chunk<string>> = Effect.serviceWithEffect(
  TestConsole.Tag,
  (console) => console.lines.get.map(Chunk.from)
)

/**
 * @tsplus static effect/query/test/TestConsole.Ops logSize
 */
export const logSize: Effect<TestConsole, never, number> = Effect.serviceWithEffect(
  TestConsole.Tag,
  (console) => console.lines.get.map((lines) => lines.length)
)
