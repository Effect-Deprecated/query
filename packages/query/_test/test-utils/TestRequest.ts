const testData: HashMap<number, string> = HashMap(
  Tuple(1, "a"),
  Tuple(2, "b"),
  Tuple(3, "c"),
  Tuple(4, "d")
)

const backendGetAll: Effect<TestConsole, never, HashMap<number, string>> = TestConsole
  .printLine("getAll called")
  .as(testData)

function backendGetSome(ids: Chunk<number>): Effect<TestConsole, never, HashMap<number, string>> {
  return TestConsole.printLine(`getSome: ${ids.map((n) => `${n}`).join(", ")} called`).as(
    HashMap.from(ids.map((id) => testData.get(id).map((value) => Tuple(id, value))).compact)
  )
}

/**
 * @tsplus type effect/query/test/TestRequest
 */
export type TestRequest = Get | GetAll

/**
 * @tsplus type effect/query/test/TestRequest.Ops
 */
export interface TestRequestOps {}
export const TestRequest: TestRequestOps = {}

export interface Get extends Request<DataSourceErrors, string> {
  readonly _tag: "Get"
  readonly id: number
}
/**
 * @tsplus static effect/query/test/TestRequest.Ops Get
 */
export const Get = Request.tagged<Get>("Get")

export interface GetAll extends Request<DataSourceErrors, HashMap<number, string>> {
  readonly _tag: "GetAll"
}
/**
 * @tsplus static effect/query/test/TestRequest.Ops GetAll
 */
export const GetAll = Request.tagged<GetAll>("GetAll")

export type DataSourceErrors = NotFound

export interface NotFound extends Case {
  readonly _tag: "NotFound"
  readonly id: number
}
/**
 * @tsplus static effect/query/test/TestRequest.Ops NotFound
 */
export const NotFound = Case.tagged<NotFound>("NotFound")

/**
 * @tsplus static effect/query/test/TestRequest.Ops DataSource
 */
export const TestRequestDataSource: DataSource<TestConsole, TestRequest> = DataSource.makeBatched(
  "TestRequestDataSource",
  (requests) => {
    const { tuple: [all, oneByOne] } = requests.partition((request) => {
      switch (request._tag) {
        case "Get": {
          return true
        }
        case "GetAll": {
          return false
        }
      }
    })
    if (all.isNonEmpty) {
      return backendGetAll.map((allItems) =>
        allItems.reduceWithIndex(
          CompletedRequestMap.empty,
          (result, id, value) => result.insert(TestRequest.Get({ id }), Either.right(value))
        ).insert(TestRequest.GetAll({}), Either.right(allItems))
      )
    } else {
      console.log({ oneByOne: oneByOne.toArray })
      return backendGetSome(oneByOne.flatMap((request) => {
        switch (request._tag) {
          case "Get": {
            return Chunk.single(request.id)
          }
          case "GetAll": {
            return Chunk.empty()
          }
        }
      })).map((items) =>
        oneByOne.reduce(CompletedRequestMap.empty, (result, request) => {
          switch (request._tag) {
            case "Get": {
              return items.get(request.id).fold(
                result.insert(request, Either.left(NotFound({ id: request.id }))),
                (value) => result.insert(request, Either.right(value))
              )
            }
            case "GetAll": {
              return result
            }
          }
        })
      )
    }
  }
)

/**
 * @tsplus static effect/query/test/TestRequest.Ops getAll
 */
export const getAll: Query<TestConsole, DataSourceErrors, HashMap<number, string>> = Query
  .fromRequest(
    GetAll({}),
    TestRequestDataSource
  )

/**
 * @tsplus static effect/query/test/TestRequest.Ops get
 */
export function get(id: number): Query<TestConsole, DataSourceErrors, string> {
  return Query.fromRequest(Get({ id }), TestRequestDataSource)
}
