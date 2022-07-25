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
export const UserRequestDataSource: DataSource<never, UserRequest> = DataSource.makeBatched(
  "UserRequestDataSource",
  (requests) =>
    Effect.when(
      HashSet.from(requests).size !== requests.size,
      Effect.dieMessage("Duplicate requests")
    ).zipRight(
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
)

/**
 * @tsplus static effect/query/test/UserRequest.Ops getAllUserIds
 */
export const getAllUserIds: Query<never, never, Chunk<number>> = Query.fromRequest(
  GetAllIds({}),
  UserRequest.DataSource
)

/**
 * @tsplus static effect/query/test/UserRequest.Ops getAllUserNames
 */
export const getAllUserNames: Query<never, never, Chunk<string>> = getAllUserIds
  .flatMap((userIds) => Query.forEachPar(userIds, getUserNameById))

/**
 * @tsplus static effect/query/test/UserRequest.Ops getUserNameById
 */
export function getUserNameById(id: number): Query<never, never, string> {
  return Query.fromRequest(GetNameById({ id }), UserRequest.DataSource)
}

Query
  .collectAllPar(Chunk.fill(2, () => UserRequest.getAllUserIds))
  .run
  .unsafeRunPromise()
  .then((a) => console.log(JSON.stringify(a, undefined, 2)))
  .catch((e) => console.log(JSON.stringify(e, undefined, 2)))
