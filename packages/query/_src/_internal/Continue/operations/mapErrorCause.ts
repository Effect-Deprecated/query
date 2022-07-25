import { Continue } from "@effect/query/_internal/Continue/definition"

/**
 * Purely maps over the failure cause of this continuation.
 *
 * @tsplus static effect/query/Continue.Aspects mapErrorCause
 * @tsplus pipeable effect/query/Continue mapErrorCause
 */
export function mapErrorCause<E, E2>(f: (e: Cause<E>) => Cause<E2>) {
  return <R, A>(self: Continue<R, E, A>): Continue<R, E2, A> => {
    switch (self._tag) {
      case "Eff": {
        return Continue.effect(self.query.mapErrorCause(f))
      }
      case "Get": {
        return Continue.get(self.io.mapErrorCause(f))
      }
    }
  }
}
