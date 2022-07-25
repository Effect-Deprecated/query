export const userIds: Chunk<number> = Chunk.range(1, 26)
export const userNames: HashMap<number, string> = HashMap.from(
  userIds.zip(Chunk.range(97, 122).map((n) => String.fromCharCode(n)))
)

/**
 * @tsplus type effect/query/test/UserRequest
 */
export type UserRequest = GetAllIds | GetNameById

export interface GetAllIds extends Request<never, Chunk<number>> {
  readonly _tag: "GetAllIds"
}
export const GetAllIds = Request.tagged<GetAllIds>("GetAllIds")

export interface GetNameById extends Request<never, string> {
  readonly _tag: "GetNameById"
  readonly id: number
}
export const GetNameById = Request.tagged<GetNameById>("GetNameById")

/**
 * @tsplus type effect/query/test/UserRequest.Ops
 */
export interface UserRequestOps {}
export const UserRequest: UserRequestOps = {}

/**
 * @tsplus static effect/query/test/UserRequest.Ops DataSource
 */
export const UserRequestDataSource: DataSource<TestConsole, UserRequest> = DataSource.makeBatched(
  "UserRequestDataSource",
  (requests) => {
    return Effect.when(
      HashSet.from(requests).size !== requests.size,
      Effect.dieMessage("Duplicate requests")
    ).zipRight(TestConsole.printLine(`${requests.map(UserRequest.print)}`)).zipRight(
      Effect.succeed(
        requests.reduce(CompletedRequestMap.empty, (completedRequests, request) => {
          switch (request._tag) {
            case "GetAllIds": {
              return completedRequests.insert(request, Either.right(userIds))
            }
            case "GetNameById": {
              return userNames.get(request.id).fold(
                completedRequests,
                (name) => completedRequests.insert(request, Either.right(name))
              )
            }
          }
        })
      )
    )
  }
)

/**
 * @tsplus static effect/query/test/UserRequest.Ops getAllUserIds
 */
export const getAllUserIds: Query<TestConsole, never, Chunk<number>> = Query.fromRequest(
  GetAllIds({}),
  UserRequest.DataSource
)

/**
 * @tsplus static effect/query/test/UserRequest.Ops getAllUserNames
 */
export const getAllUserNames: Query<TestConsole, never, Chunk<string>> = getAllUserIds
  .flatMap((userIds) => Query.forEachPar(userIds, getUserNameById))

/**
 * @tsplus static effect/query/test/UserRequest.Ops getUserNameById
 */
export function getUserNameById(id: number): Query<TestConsole, never, string> {
  return Query.fromRequest(GetNameById({ id }), UserRequest.DataSource)
}

/**
 * @tsplus static effect/query/test/UserRequest.Ops print
 * @tsplus getter effect/query/test/UserRequest print
 */
export function print(request: UserRequest): string {
  switch (request._tag) {
    case "GetAllIds": {
      return request._tag
    }
    case "GetNameById": {
      return `${request._tag}(${request.id})`
    }
  }
}
