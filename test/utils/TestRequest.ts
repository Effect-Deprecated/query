import * as Effect from "@effect/io/Effect"
import * as DataSource from "@effect/query/DataSource"
import * as Query from "@effect/query/Query"
import * as Request from "@effect/query/Request"
import * as TestConsole from "@effect/query/test/utils/TestConsole"
import * as Either from "@fp-ts/core/Either"
import { pipe } from "@fp-ts/core/Function"
import * as Option from "@fp-ts/core/Option"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Data from "@fp-ts/data/Data"
import * as HashMap from "@fp-ts/data/HashMap"

const testData: HashMap.HashMap<number, string> = HashMap.make(
  [1, "a"],
  [2, "b"],
  [3, "c"],
  [4, "d"]
)

const backendGetAll: Effect.Effect<TestConsole.TestConsole, never, HashMap.HashMap<number, string>> = Effect.as(
  TestConsole.printLine("getAll called"),
  testData
)

const backendGetSome = (ids: Chunk.Chunk<number>): Effect.Effect<
  TestConsole.TestConsole,
  never,
  HashMap.HashMap<number, string>
> =>
  pipe(
    TestConsole.printLine(`getSome: ${pipe(ids, Chunk.map((n) => `${n}`), Chunk.join(", "))} called`),
    Effect.as(pipe(
      ids,
      Chunk.map((id) => pipe(testData, HashMap.get(id), Option.map((value) => [id, value] as const))),
      Chunk.compact,
      HashMap.fromIterable
    ))
  )

export type TestRequest = Get | GetAll

export interface Get extends Request.Request<DataSourceErrors, string> {
  readonly _tag: "Get"
  readonly id: number
}

export const Get = Request.tagged<Get>("Get")

export interface GetAll extends Request.Request<DataSourceErrors, HashMap.HashMap<number, string>> {
  readonly _tag: "GetAll"
}

export const GetAll = Request.tagged<GetAll>("GetAll")

export type DataSourceErrors = NotFound

export interface NotFound extends Data.Case {
  readonly _tag: "NotFound"
  readonly id: number
}

export const NotFound = Data.tagged<NotFound>("NotFound")

export const TestDataSource: DataSource.DataSource<TestConsole.TestConsole, TestRequest> = DataSource.makeBatched(
  "TestDataSource",
  (requests) => {
    const [all, oneByOne] = pipe(
      requests,
      Chunk.partitionMap((req) =>
        req._tag === "GetAll"
          ? Either.left(req)
          : Either.right(req)
      )
    )
    if (Chunk.isNonEmpty(all)) {
      return pipe(
        backendGetAll,
        Effect.flatMap((allItems) =>
          pipe(
            Effect.forEachDiscard(allItems, ([id, value]) => Request.succeed(Get({ id }), value)),
            Effect.zipRight(Request.succeed(GetAll({}), allItems))
          )
        )
      )
    }
    return pipe(
      backendGetSome(pipe(oneByOne, Chunk.map((req) => req.id))),
      Effect.flatMap((items) =>
        Effect.forEachDiscard(oneByOne, (request) => {
          const value = pipe(items, HashMap.get(request.id))
          if (Option.isSome(value)) {
            return Request.succeed(request, value.value)
          } else {
            return Request.fail(request, NotFound({ id: request.id }))
          }
        })
      )
    )
  }
)

export const getAll: Query.Query<TestConsole.TestConsole, DataSourceErrors, HashMap.HashMap<number, string>> = Query
  .fromRequest(GetAll({}), TestDataSource)

export const get = (id: number): Query.Query<TestConsole.TestConsole, DataSourceErrors, string> =>
  Query.fromRequest(Get({ id }), TestDataSource)
