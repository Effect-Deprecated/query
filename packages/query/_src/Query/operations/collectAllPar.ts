import { collectAllParQuery } from "@effect/query/_internal/Continue/operations/collectAllPar"

/**
 * Collects a collection of queries into a query returning a collection of
 * their results. Requests will be executed in parallel and will be batched.
 *
 * @tsplus static effect/query/Query.Ops collectAllPar
 */
export const collectAllPar = collectAllParQuery
