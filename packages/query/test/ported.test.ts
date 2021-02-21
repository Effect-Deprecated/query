import "@effect-ts/core/Operators"

import * as A from "@effect-ts/core/Array"
import * as T from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as REF from "@effect-ts/core/Effect/Ref"
import * as E from "@effect-ts/core/Either"
import { identity, pipe } from "@effect-ts/core/Function"
import type { Has } from "@effect-ts/core/Has"
import { tag } from "@effect-ts/core/Has"
import * as MAP from "@effect-ts/core/Map"
import * as O from "@effect-ts/core/Option"

import * as CR from "../src/CompletedRequestMap"
import * as DS from "../src/DataSource"
import * as Q from "../src/Query"
import { QueryFailure } from "../src/QueryFailure"
import { StandardRequest } from "../src/Request"

interface TestConsole {
  lines: REF.Ref<A.Array<string>>
}

const TestConsole = tag<TestConsole>()

const emptyTestConsole = T.map_(REF.makeRef<A.Array<string>>([]), (lines) => ({
  lines
}))

function putStrLn(line: string): T.RIO<Has<TestConsole>, void> {
  return T.accessServiceM(TestConsole)((c) =>
    REF.update_(c.lines, (lines) => A.concat_(lines, [line]))
  )
}

const getLogSize = T.accessServiceM(TestConsole)((c) =>
  T.map_(REF.get(c.lines), (lines) => lines.length)
)

const userIds: A.Array<number> = A.range(1, 26)

const userNames: MAP.Map<number, string> = MAP.make(
  A.zip_(
    userIds,
    A.map_(A.range(1, 26), (_) => _.toString(36))
  )
)

class GetAllIds extends StandardRequest<never, A.Array<number>> {
  readonly _tag = "GetAllIds"
}

class GetNameById extends StandardRequest<never, string> {
  readonly _tag = "GetNameById"
  constructor(public readonly id: number) {
    super()
  }
}

class GetAgeByName extends StandardRequest<never, number> {
  readonly _tag = "GetAgeByName"
  constructor(public readonly name: string) {
    super()
  }
}

type UserRequest = GetAllIds | GetNameById | GetAgeByName

const UserRequestDataSource = DS.makeBatched("UserRequestDataSource")(
  (requests: A.Array<UserRequest>) =>
    T.andThen_(
      putStrLn("Running request..."),
      T.succeed(
        A.reduce_(requests, CR.empty, (crm, _) => {
          switch (_._tag) {
            case "GetAllIds":
              return CR.insert(_)(E.right(userIds))(crm)
            case "GetNameById":
              return O.fold_(
                MAP.lookup_(userNames, _.id),
                () => crm,
                (userName) => CR.insert(_)(E.right(userName))(crm)
              )
            case "GetAgeByName":
              return CR.insert(_)(E.right(18 + _.name.length))(crm)
          }
        })
      )
    )
)["|>"](DS.batchN(100))

const getAllUserIds = Q.fromRequest(new GetAllIds())(UserRequestDataSource)

const getUserNameById = (id: number) =>
  Q.fromRequest(new GetNameById(id))(UserRequestDataSource)

const getAllUserNames = Q.chain_(getAllUserIds, (userIds) =>
  Q.forEachPar(userIds, getUserNameById)
)

const getAgeByName = (name: string) =>
  Q.fromRequest(new GetAgeByName(name))(UserRequestDataSource)

const getAgeById = (id: number) =>
  Q.chain_(getUserNameById(id), (name) => getAgeByName(name))

describe("Query", () => {
  it("basic query", async () => {
    const f = pipe(
      Q.run(getAllUserIds),
      T.provideServiceM(TestConsole)(emptyTestConsole)
    )
    expect(await T.runPromise(f)).toEqual(userIds)
  })
  it("sequential", async () => {
    const f = pipe(
      Q.run(getAgeById(1)),
      T.provideServiceM(TestConsole)(emptyTestConsole)
    )
    expect(await T.runPromise(f)).toEqual(19)
  })
  it("sequential zip", async () => {
    const f = pipe(
      getUserNameById(1),
      Q.zipWith(getUserNameById(2), (a, b) => a + b),
      Q.run,
      T.provideServiceM(TestConsole)(emptyTestConsole)
    )
    expect(await T.runPromise(f)).toEqual("12")
  })
  it("parallel", async () => {
    const f = pipe(
      getUserNameById(1),
      Q.zipWithPar(getUserNameById(2), (a, b) => a + b),
      Q.run,
      T.provideServiceM(TestConsole)(emptyTestConsole)
    )
    expect(await T.runPromise(f)).toEqual("12")
  })
  it("solves_N_1_problem", async () => {
    const f = pipe(
      Q.run(getAllUserNames),
      T.chain(() => getLogSize),
      T.provideServiceM(TestConsole)(emptyTestConsole)
    )
    expect(await T.runPromise(f)).toEqual(2)
  })
  it("mapError does not prevent batching", async () => {
    const a = pipe(getUserNameById(1), Q.zip(getUserNameById(2)), Q.mapError(identity))
    const b = pipe(getUserNameById(3), Q.zip(getUserNameById(4)), Q.mapError(identity))

    const f = pipe(
      Q.collectAllPar([a, b]),
      Q.run,
      T.chain(() => getLogSize),
      T.provideServiceM(TestConsole)(emptyTestConsole)
    )
    expect(await T.runPromise(f)).toEqual(2)
  })
  it("failure to complete request is query failure", async () => {
    const f = pipe(
      getUserNameById(27),
      Q.run,
      T.provideServiceM(TestConsole)(emptyTestConsole)
    )
    expect(await T.runPromiseExit(T.untraced(f))).toEqual(
      Ex.die(new QueryFailure(UserRequestDataSource, new GetNameById(27)))
    )
  })
  it("timed does not prevent batching", async () => {
    const a = pipe(getUserNameById(1), Q.zip(getUserNameById(2)), Q.timed)
    const b = pipe(getUserNameById(3), Q.zip(getUserNameById(4)), Q.timed)

    const f = pipe(
      Q.collectAllPar([a, b]),
      Q.run,
      T.chain(() => getLogSize),
      T.provideServiceM(TestConsole)(emptyTestConsole)
    )
    expect(await T.runPromise(f)).toEqual(2)
  })
  it("optional converts a query to one that returns its value optionally", async () => {
    const f = pipe(
      getUserNameById(27),
      Q.map(identity),
      Q.optional,
      Q.run,
      T.provideServiceM(TestConsole)(emptyTestConsole)
    )
    expect(await T.runPromise(f)).toEqual(O.none)
  })
})
