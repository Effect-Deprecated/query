import { Continue } from "@effect/query/_internal/Continue/definition"

/**
 * Purely maps over the failure type of this continuation.
 *
 * @tsplus static effect/query/Continue.Aspects mapError
 * @tsplus pipeable effect/query/Continue mapError
 */
export function mapError<E, E2>(f: (e: E) => E2) {
  return <R, A>(self: Continue<R, E, A>): Continue<R, E2, A> => {
    switch (self._tag) {
      case "Eff": {
        return Continue.effect(self.query.mapError(f))
      }
      case "Get": {
        return Continue.get(self.io.mapError(f))
      }
    }
  }
}
