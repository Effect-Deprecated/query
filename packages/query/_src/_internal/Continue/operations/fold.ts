import { Continue } from "@effect/query/_internal/Continue/definition"

/**
 * Purely folds over the failure and success types of this continuation.
 *
 * @tsplus static effect/query/Continue.Aspects fold
 * @tsplus pipeable effect/query/Continue fold
 */
export function fold<E, A, A1, A2>(failure: (e: E) => A1, success: (a: A) => A2) {
  return <R>(self: Continue<R, E, A>): Continue<R, never, A1 | A2> => {
    switch (self._tag) {
      case "Eff": {
        return Continue.effect(self.query.fold(failure, success))
      }
      case "Get": {
        return Continue.get(self.io.fold(failure, success))
      }
    }
  }
}
