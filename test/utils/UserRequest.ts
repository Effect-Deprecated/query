import * as Chunk from "@effect/data/Chunk"
import * as HashSet from "@effect/data/HashSet"
import * as Effect from "@effect/io/Effect"
import * as DataSource from "@effect/query/DataSource"
import * as Query from "@effect/query/Query"
import * as Request from "@effect/query/Request"
import * as TestConsole from "@effect/query/test/utils/TestConsole"
import * as Either from "@fp-ts/core/Either"
import { pipe } from "@fp-ts/core/Function"
import * as ReadonlyArray from "@fp-ts/core/ReadonlyArray"

export const userIds: ReadonlyArray<number> = ReadonlyArray.range(1, 26)

export const userNames: ReadonlyMap<number, string> = new Map(
  pipe(
    userIds,
    ReadonlyArray.zipWith(
      pipe(ReadonlyArray.range(97, 122), ReadonlyArray.map(String.fromCharCode)),
      (a, b) => [a, b] as const
    )
  )
)

export type UserRequest = GetAllIds | GetNameById

export interface GetAllIds extends Request.Request<never, ReadonlyArray<number>> {
  readonly _tag: "GetAllIds"
}

export const GetAllIds = Request.tagged<GetAllIds>("GetAllIds")

export interface GetNameById extends Request.Request<never, string> {
  readonly _tag: "GetNameById"
  readonly id: number
}

export const GetNameById = Request.tagged<GetNameById>("GetNameById")

export const UserDataSource: DataSource.DataSource<TestConsole.TestConsole, UserRequest> = DataSource
  .makeBatched("UserRequestDataSource", (requests) =>
    pipe(
      Effect.dieMessage("Duplicate requests"),
      Effect.when(() => HashSet.size(HashSet.fromIterable(requests)) !== Chunk.size(requests)),
      Effect.zipRight(TestConsole.printLine(`${pipe(requests, Chunk.map(print))}`)),
      Effect.zipRight(Effect.forEachDiscard(requests, (request) => {
        switch (request._tag) {
          case "GetAllIds": {
            return Request.complete(request, Either.right(userIds))
          }
          case "GetNameById": {
            if (userNames.has(request.id)) {
              const userName = userNames.get(request.id)!
              return Request.complete(request, Either.right(userName))
            }
            return Effect.unit()
          }
        }
      }))
    ))

export const getAllUserIds: Query.Query<TestConsole.TestConsole, never, ReadonlyArray<number>> = Query.fromRequest(
  GetAllIds({}),
  UserDataSource
)

export const getUserNameById = (id: number): Query.Query<TestConsole.TestConsole, never, string> =>
  Query.fromRequest(GetNameById({ id }), UserDataSource)

export const getAllUserNames: Query.Query<TestConsole.TestConsole, never, ReadonlyArray<string>> = pipe(
  getAllUserIds,
  Query.flatMap(Query.forEachPar(getUserNameById)),
  Query.map(Chunk.toReadonlyArray)
)

export const print = (request: UserRequest): string => {
  switch (request._tag) {
    case "GetAllIds": {
      return request._tag
    }
    case "GetNameById": {
      return `${request._tag}(${request.id})`
    }
  }
}
