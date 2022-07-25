import { collectAllParResult } from "@effect/query/_internal/Continue/operations/collectAllPar"

/**
 * Collects a collection of results into a single result. Blocked requests
 * and their continuations will be executed in parallel.
 *
 * @tsplus static effect/query/Result.Ops collectAllPar
 */
export const collectAllPar = collectAllParResult
