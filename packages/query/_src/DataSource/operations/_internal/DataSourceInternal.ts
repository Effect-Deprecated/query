import { DataSourceSym } from "@effect/query/DataSource/definition"

export class DataSourceInternal<R, A> implements DataSource<R, A> {
  readonly [DataSourceSym]: DataSourceSym = DataSourceSym

  constructor(
    readonly identifier: string,
    readonly runAll: (requests: Chunk<Chunk<A>>) => Effect<R, never, CompletedRequestMap>
  ) {}

  [Hash.sym](): number {
    return Hash.string(this.identifier)
  }

  [Equals.sym](that: unknown): boolean {
    return DataSource.is(that) && this.identifier === that.identifier
  }
}
