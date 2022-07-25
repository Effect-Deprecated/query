import { Continue } from "@effect/query/_internal/Continue/definition"
import { Result } from "@effect/query/_internal/Result/definition"
import {
  concreteQuery,
  QueryInternal
} from "@effect/query/Query/operations/_internal/QueryInternal"
/**
 * Purely maps over the success type of this continuation.
 *
 * @tsplus static effect/query/Continue.Aspects map
 * @tsplus pipeable effect/query/Continue map
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: Continue<R, E, A>): Continue<R, E, B> => {
    switch (self._tag) {
      case "Eff": {
        return Continue.effect(_mapQuery(self.query, f))
      }
      case "Get": {
        return Continue.get(self.io.map(f))
      }
    }
  }
}

export function mapResult<R, E, A, B>(self: Result<R, E, A>, f: (a: A) => B): Result<R, E, B> {
  switch (self._tag) {
    case "Blocked": {
      return Result.blocked(self.blockedRequests, self.cont.map(f))
    }
    case "Done": {
      return Result.done(f(self.value))
    }
    case "Fail": {
      return self
    }
  }
}

export function _mapQuery<R, E, A, B>(self: Query<R, E, A>, f: (a: A) => B): Query<R, E, B> {
  concreteQuery(self)
  return new QueryInternal(self.step.map((result) => mapResult(result, f)))
}
