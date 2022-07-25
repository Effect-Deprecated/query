import { Stackless } from "@effect/core/io/Cause"

/**
 * Converts this query to one that returns `Some` if data sources return
 * results for all requests received and `None` otherwise.
 *
 * @tsplus getter effect/query/Query optional
 */
export function optional<R, E, A>(self: Query<R, E, A>): Query<R, E, Maybe<A>> {
  return self.foldCauseQuery(
    (cause) =>
      stripSomeDefects(cause, (u) => QueryFailure.is(u) ? Maybe.some(undefined) : Maybe.none)
        .fold(Query.none, (cause) => Query.failCause(cause)),
    (a) => Query.some(a)
  )
}

/**
 * TODO: Remove after: https://github.com/Effect-TS/core/pull/1259
 *
 * Remove all `Die` causes that the specified partial function is defined at,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 */
export function stripSomeDefects<E>(
  cause: Cause<E>,
  pf: (defect: unknown) => unknown
): Maybe<Cause<E>> {
  return cause.fold<E, Maybe<Cause<E>>>(
    Maybe.some(Cause.empty),
    (e, trace) => Maybe.some(Cause.fail(e, trace)),
    (t, trace) => pf(t) ? Maybe.none : Maybe.some(Cause.die(t, trace)),
    (fiberId, trace) => Maybe.some(Cause.interrupt(fiberId, trace)),
    (x, y) => {
      if (x.isSome() && y.isSome()) {
        return Maybe.some(Cause.then(x.value, y.value))
      }
      if (x.isSome() && y.isNone()) {
        return Maybe.some(x.value)
      }
      if (x.isNone() && y.isSome()) {
        return Maybe.some(y.value)
      }
      return Maybe.none
    },
    (x, y) => {
      if (x.isSome() && y.isSome()) {
        return Maybe.some(Cause.both(x.value, y.value))
      }
      if (x.isSome() && y.isNone()) {
        return Maybe.some(x.value)
      }
      if (x.isNone() && y.isSome()) {
        return Maybe.some(y.value)
      }
      return Maybe.none
    },
    (causeOption, stackless) => causeOption.map((cause) => new Stackless(cause, stackless))
  )
}
