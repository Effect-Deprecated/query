import * as A from "@effect-ts/core/Common/Array";
import * as MAP from "@effect-ts/core/Common/Map";
import * as E from "@effect-ts/core/Common/Either";
import * as O from "@effect-ts/core/Common/Option";
import * as T from "@effect-ts/core/Effect";
import * as REF from "@effect-ts/core/Effect/Ref";
import { StandardRequest } from "../src/Request";
import * as DS from "../src/DataSource";
import * as Q from "../src/Query";
import * as CR from "../src/CompletedRequestMap";
import { Has, tag } from "@effect-ts/core/Has";
import { pipe } from "@effect-ts/core/Function";

interface TestConsole {
  lines: REF.Ref<A.Array<string>>;
}
const TestConsole = tag<TestConsole>();
const emptyTestConsole = T.map_(REF.makeRef<A.Array<string>>([]), (lines) => ({
  lines,
}));

function putStrLn(line: string): T.RIO<Has<TestConsole>, void> {
  return T.andThen_(
    T.accessServiceM(TestConsole)((c) =>
      REF.update_(c.lines, (lines) => A.concat_(lines, [line]))
    ),
    T.effectTotal(() => console.log(line))
  );
}

const getLogSize = T.accessServiceM(TestConsole)((c) =>
  T.map_(REF.get(c.lines), (lines) => lines.length)
);

const userIds: A.Array<number> = A.range(1, 26);
const userNames: MAP.Map<number, string> = MAP.make(
  A.zip_(
    userIds,
    A.map_(A.range(1, 26), (_) => _.toString(36))
  )
);

class GetAllIds extends StandardRequest<never, A.Array<number>> {
  readonly _tag = "GetAllIds";
}

class GetNameById extends StandardRequest<never, string> {
  readonly _tag = "GetNameById";
  constructor(public readonly id: number) {
    super(); // TODO: MEH
  }
}

type UserRequest = GetAllIds | GetNameById;

const UserRequestDataSource = DS.makeBatched("UserRequestDataSource")(
  (requests: A.Array<UserRequest>) =>
    T.andThen_(
      putStrLn("Running request..."),
      T.succeed(
        A.reduce_(requests, CR.empty, (crm, _) => {
          switch (_._tag) {
            case "GetAllIds":
              return CR.insert(_)(E.right(userIds))(crm);
            case "GetNameById":
              return O.fold_(
                MAP.lookup_(userNames, _.id),
                () => crm,
                (userName) => CR.insert(_)(E.right(userName))(crm)
              );
          }
        })
      )
    )
);

const getAllUserIds = Q.fromRequest(new GetAllIds())(UserRequestDataSource);
const getUserNameById = (id: number) =>
  Q.fromRequest(new GetNameById(id))(UserRequestDataSource);

const getAllUserNames = Q.chain_(getAllUserIds, (userIds) =>
  Q.foreachPar_(userIds, getUserNameById)
);

describe("Query", () => {
  it("solves N+1 problem", async () => {
    const f = pipe(
      Q.run(getAllUserNames),
      T.chain(() => getLogSize),
      T.provideServiceM(TestConsole)(emptyTestConsole)
    );
    expect(await T.runPromise(f)).toEqual(2);
  });
});
