// ets_tracing: off

import "@effect-ts/system/Operator"

import type { DataSource } from "../DataSource/index.js"
import type { Request } from "../Request/index.js"

export class QueryFailure {
  readonly _tag = "QueryFailure"
  constructor(
    readonly dataSource: DataSource<never, never>,
    readonly request: Request<any, any>
  ) {}
}
