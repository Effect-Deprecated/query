/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E2`.
 *
 * @tsplus static effect/query/Query.Aspects unrefineWith
 * @tsplus pipeable effect/query/Query unrefineWith
 */
export function unrefineWith<E, E2>(pf: (defect: unknown) => Maybe<E2>, f: (e: E) => E2) {
  return <R, A>(self: Query<R, E, A>): Query<R, E2, A> =>
    self.catchAllCause((cause) =>
      cause.find((cause) => cause.isDieType() ? pf(cause.value) : Maybe.none).fold(
        Query.failCause(cause.map(f)),
        (e2) => Query.fail(e2)
      )
    )
}
