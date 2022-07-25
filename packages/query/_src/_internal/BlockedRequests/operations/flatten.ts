import type { BlockedRequests } from "@effect/query/_internal/BlockedRequests/definition"
import { Par, Seq } from "@effect/query/_internal/BlockedRequests/definition"
import { Parallel } from "@effect/query/_internal/Parallel"
import type { Sequential } from "@effect/query/_internal/Sequential"
import { Tuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Flattens a collection of blocked requests into a collection of pipelined
 * and batched requests that can be submitted for execution.
 *
 * @tsplus static effect/query/BlockedRequests.Ops flatten
 * @tsplus getter effect/query/BlockedRequests flatten
 */
export function flatten<R>(self: BlockedRequests<R>): List<Sequential<R>> {
  return flattenLoop(List(self), List.nil())
}

/**
 * @tsplus tailRec
 */
function flattenLoop<R>(
  blockedRequests: List<BlockedRequests<R>>,
  flattened: List<Sequential<R>>
): List<Sequential<R>> {
  const { tuple: [parallel, sequential] } = blockedRequests.reduce(
    Tuple(Parallel.empty<R>(), List.empty<BlockedRequests<R>>()),
    ({ tuple: [parallel, sequential] }, blockedRequest) => {
      const { tuple: [par, seq] } = step(blockedRequest)
      return Tuple(parallel.combinePar(par), sequential.concat(seq))
    }
  )
  const updated = merge(flattened, parallel)
  if (sequential.isNil()) {
    return updated.reverse
  }
  return flattenLoop(sequential, updated)
}

/**
 * Takes one step in evaluating a collection of blocked requests, returning a
 * collection of blocked requests that can be performed in parallel and a
 * list of blocked requests that must be performed sequentially after those
 * requests.
 */
function step<R>(self: BlockedRequests<R>): Tuple<[Parallel<R>, List<BlockedRequests<R>>]> {
  return stepLoop(self, List.nil(), Parallel.empty(), List.nil())
}

/**
 * @tsplus tailRec
 */
function stepLoop<R>(
  self: BlockedRequests<R>,
  stack: List<BlockedRequests<R>>,
  parallel: Parallel<R>,
  sequential: List<BlockedRequests<R>>
): Tuple<[Parallel<R>, List<BlockedRequests<R>>]> {
  switch (self._tag) {
    case "Empty": {
      if (stack.isNil()) {
        return Tuple(parallel, sequential)
      }
      return stepLoop(stack.head, stack.tail, parallel, sequential)
    }
    case "Seq": {
      const left = self.left
      const right = self.right
      switch (left._tag) {
        case "Empty": {
          return stepLoop(right, stack, parallel, sequential)
        }
        case "Seq": {
          const l = left.left
          const r = left.right
          return stepLoop(
            new Seq(l, new Seq(r, right)),
            stack,
            parallel,
            sequential
          )
        }
        case "Par": {
          const l = left.left
          const r = left.right
          return stepLoop(
            new Par(new Seq(l, right), new Seq(r, right)),
            stack,
            parallel,
            sequential
          )
        }
        case "Single": {
          return stepLoop(left, stack, parallel, sequential.prepend(self.right))
        }
      }
    }
    case "Par": {
      return stepLoop(self.left, stack.prepend(self.right), parallel, sequential)
    }
    case "Single": {
      if (stack.isNil()) {
        return Tuple(
          parallel.combinePar(Parallel(self.dataSource, self.blockedRequest)),
          sequential
        )
      }
      return stepLoop(
        stack.head,
        stack.tail,
        parallel.combinePar(Parallel(self.dataSource, self.blockedRequest)),
        sequential
      )
    }
  }
}

/**
 * Merges a collection of requests that must be executed sequentially with a
 * collection of requests that can be executed in parallel. If the
 * collections are both from the same single data source then the requests
 * can be pipelined while preserving ordering guarantees.
 */
function merge<R>(sequential: List<Sequential<R>>, parallel: Parallel<R>): List<Sequential<R>> {
  if (sequential.isNil()) {
    return List(parallel.sequential)
  }
  if (parallel.isEmpty) {
    return sequential
  }
  const seqKeys = Chunk.from(sequential.head.keys)
  const parKeys = Chunk.from(parallel.keys)
  if (seqKeys.length === 1 && parKeys.length === 1 && Equals.equals(seqKeys, parKeys)) {
    return sequential.tail.prepend(sequential.head.combineSeq(parallel.sequential))
  }
  return sequential.prepend(parallel.sequential)
}
