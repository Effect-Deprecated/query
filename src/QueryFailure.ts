import { DataSource } from "./DataSource";
import { Request } from "./Request";

export class QueryFailure {
  readonly _tag = "QueryFailure";
  constructor(
    readonly dataSource: DataSource<never, never>,
    readonly request: Request<any, any>
  ) {}
}
