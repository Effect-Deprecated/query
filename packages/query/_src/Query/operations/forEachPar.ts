import { forEachParQuery } from "@effect/query/_internal/Continue/operations/collectAllPar"

/**
 * Performs a query for each element in a collection, collecting the results
 * into a query returning a collection of their results. Requests will be
 * executed in parallel and will be batched.
 *
 * @tsplus static effect/query/Query.Ops forEachPar
 */
export const forEachPar = forEachParQuery
