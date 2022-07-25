/**
 * Takes some fiber failures and converts them into errors.
 *
 * @tsplus static effect/query/Query.Aspects unrefine
 * @tsplus pipeable effect/query/Query unrefine
 */
export function unrefine<E>(pf: (defect: unknown) => Maybe<E>) {
  return <R, A>(self: Query<R, E, A>): Query<R, E, A> => self.unrefineWith(pf, identity)
}
