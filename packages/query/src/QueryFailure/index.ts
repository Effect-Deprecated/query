import "@effect-ts/system/Operator"

import type { DataSource } from "../DataSource"
import type { Request } from "../Request"

export class QueryFailure {
  readonly _tag = "QueryFailure"
  constructor(
    readonly dataSource: DataSource<never, never>,
    readonly request: Request<any, any>
  ) {}
}
