import { BlockedRequests } from "@effect/query/_internal/BlockedRequests/definition"
import { Continue } from "@effect/query/_internal/Continue/definition"
import { Result } from "@effect/query/_internal/Result/definition"
import {
  concreteQuery,
  QueryInternal
} from "@effect/query/Query/operations/_internal/QueryInternal"
import { Tuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Collects a collection of continuation into a continuation returning a
 * collection of their results, in parallel.
 *
 * @tsplus static effect/query/Continue.Ops collectAllPar
 */
export function collectAllPar<R, E, A>(
  conts: Collection<Continue<R, E, A>>
): Continue<R, E, Chunk<A>> {
  const conts0 = Chunk.from(conts)
  const { tuple: [queries, ios] } = conts0.zipWithIndex.reduce(
    Tuple(
      Chunk.empty<Tuple<[Query<R, E, A>, number]>>(),
      Chunk.empty<Tuple<[Effect<never, E, A>, number]>>()
    ),
    ({ tuple: [queries, ios] }, { tuple: [cont, index] }) => {
      switch (cont._tag) {
        case "Eff": {
          return Tuple(queries.append(Tuple(cont.query, index)), ios)
        }
        case "Get": {
          return Tuple(queries, ios.append(Tuple(cont.io, index)))
        }
      }
    }
  )

  if (queries.isEmpty) {
    return Continue.get(Effect.collectAll(() => ios.map((tuple) => tuple.get(0))))
  }
  const query = collectAllParQuery(queries.map((tuple) => tuple.get(0))).flatMap((as) => {
    const array: Array<A> = new Array(conts0.length)
    as.zip(queries.map((tuple) => tuple.get(1))).forEach(({ tuple: [a, i] }) => {
      array[i] = a
    })
    return Query.fromEffect(Effect.collectAll(ios.map((tuple) => tuple.get(0)))).map((as) => {
      as.zip(ios.map((tuple) => tuple.get(1))).forEach(({ tuple: [a, i] }) => {
        array[i] = a
      })
      return Chunk.from(as)
    })
  })
  return Continue.effect(query)
}

export function collectAllParResult<R, E, A>(
  results: Collection<Result<R, E, A>>
): Result<R, E, Chunk<A>> {
  const results0 = Chunk.from(results)
  const { tuple: [blocked, done, fails] } = results0.zipWithIndex.reduce(
    Tuple(
      Chunk.empty<Tuple<[Tuple<[BlockedRequests<R>, Continue<R, E, A>]>, number]>>(),
      Chunk.empty<Tuple<[A, number]>>(),
      Chunk.empty<Tuple<[Cause<E>, number]>>()
    ),
    ({ tuple: [blocked, done, fails] }, { tuple: [result, index] }) => {
      switch (result._tag) {
        case "Blocked": {
          return Tuple(
            blocked.append(Tuple(Tuple(result.blockedRequests, result.cont), index)),
            done,
            fails
          )
        }
        case "Done": {
          return Tuple(blocked, done.append(Tuple(result.value, index)), fails)
        }
        case "Fail": {
          return Tuple(blocked, done, fails.append(Tuple(result.cause, index)))
        }
      }
    }
  )

  if (blocked.isEmpty && fails.isEmpty) {
    return Result.done(done.map((tuple) => tuple.get(0)))
  }
  if (fails.isEmpty) {
    const blockedRequests = blocked.map((tuple) => tuple.get(0).get(0)).reduce(
      BlockedRequests.empty as BlockedRequests<R>,
      (a, b) => a.combinePar(b)
    )
    const cont = Continue.collectAllPar(blocked.map((tuple) => tuple.get(0).get(1))).map((as) => {
      const array: Array<A> = new Array(results0.length)
      as.zip(blocked.map((tuple) => tuple.get(1))).forEach(({ tuple: [a, i] }) => {
        array[i] = a
      })
      done.forEach(({ tuple: [a, i] }) => {
        array[i] = a
      })
      return Chunk.from(array)
    })
    return Result.blocked(blockedRequests, cont)
  }
  return Result.fail(fails.map((tuple) => tuple.get(0)).reduce(Cause.empty as Cause<E>, Cause.both))
}

export function forEachParQuery<R, E, A, B>(
  as: Collection<A>,
  f: (a: A) => Query<R, E, B>
): Query<R, E, Chunk<B>> {
  return new QueryInternal(
    Effect.forEachPar(as, (a) => {
      const query = f(a)
      concreteQuery(query)
      return query.step
    }).map(collectAllParResult)
  )
}

export function collectAllParQuery<R, E, A>(as: Collection<Query<R, E, A>>): Query<R, E, Chunk<A>> {
  return forEachParQuery(as, identity)
}
