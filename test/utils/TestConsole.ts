import * as Context from "@effect/data/Context"
import * as ReadonlyArray from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Ref from "@effect/io/Ref"

export interface TestConsole {
  readonly lines: Ref.Ref<ReadonlyArray<string>>
}

export const TestConsole: Context.Tag<TestConsole, TestConsole> = Context.Tag<TestConsole>()

export const empty = (): Effect.Effect<never, never, TestConsole> =>
  Effect.map(
    Ref.make<ReadonlyArray<string>>([]),
    (lines) => ({ lines })
  )

export const layer: Layer.Layer<never, never, TestConsole> = Layer.effect(TestConsole, empty())

export const printLine = (line: string): Effect.Effect<TestConsole, never, void> =>
  Effect.flatMap(
    TestConsole,
    (console) => Ref.update(console.lines, ReadonlyArray.append(line))
  )

export const output: Effect.Effect<TestConsole, never, ReadonlyArray<string>> = Effect.flatMap(
  TestConsole,
  (console) => Ref.get(console.lines)
)

export const logSize: Effect.Effect<TestConsole, never, number> = Effect.flatMap(
  TestConsole,
  (console) =>
    Effect.map(
      Ref.get(console.lines),
      (lines) => lines.length
    )
)
