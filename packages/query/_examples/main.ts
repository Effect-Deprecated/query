import { Request } from "@effect/query/Request"
import type { RequestInfo, RequestInit, Response } from "node-fetch"
import fetch from "node-fetch"

export interface FetchError extends Case {
  readonly _tag: "FetchError"
  readonly error: unknown
}
export const FetchError = Case.tagged<FetchError>("FetchError")

/**
 * @tsplus type effect/query/examples/FetchService
 */
export interface FetchService {
  readonly fetch: (
    input: RequestInfo,
    init?: RequestInit | undefined
  ) => Effect<never, FetchError, Response>
}

/**
 * @tsplus type effect/query/examples/FetchService.Ops
 */
export interface FetchServiceOps {
  readonly Tag: Tag<FetchService>
}
export const FetchService: FetchServiceOps = {
  Tag: Tag<FetchService>()
}

/**
 * @tsplus static effect/query/examples/FetchService.Ops live
 */
export const live: Layer<never, never, FetchService> = Layer.fromValue(FetchService.Tag, {
  fetch: (input, init) =>
    Effect.asyncInterrupt<never, FetchError, Response>((resume) => {
      const abortController = new AbortController()
      fetch(input, { ...(init || {}), signal: abortController.signal as any })
        .then((response) => resume(Effect.succeed(response)))
        .catch((error) => resume(Effect.fail(FetchError({ error }))))
      return Either.left(Effect.sync(abortController.abort()))
    })
})

export interface Quote {
  readonly id: string
  readonly author: string
  readonly en: string
}
export const Quote = Derive<Codec<Quote>>()

export interface QuoteNotFoundError extends Case {
  readonly _tag: "QuoteNotFound"
  readonly type: string
  readonly title: string
  readonly status: 0
  readonly detail: string
  readonly instance: string
}
export const QuoteNotFoundError = Case.tagged<QuoteNotFoundError>("QuoteNotFound")

export type QuoteRequest = GetRandomQuote | GetQuotes

export interface GetRandomQuote extends Request<never, Quote> {
  readonly _tag: "GetRandomQuote"
}
export const GetRandomQuote = Request.tagged<GetRandomQuote>("GetRandomQuote")

export interface GetQuotes extends Request<never, Chunk<Quote>> {
  readonly _tag: "GetQuotes"
  readonly count: number
}
export const GetQuotes = Request.tagged<GetQuotes>("GetQuotes")

export const QuoteDataSource = DataSource.fromFunctionBatchedEffect<
  FetchService,
  FetchError | QuoteNotFoundError,
  QuoteRequest
>(
  "QuoteDataSource",
  (requests) =>
    Effect.service<FetchService>(FetchService.Tag).flatMap(({ fetch }) =>
      Effect.forEachPar(requests, (request) => {
        switch (request._tag) {
          case "GetQuotes": {
            /** @tsplus inline */
            const quotes = Derive<Decoder<Chunk<Quote>>>()
            const queryParams = `?count=${request.count}`
            return fetch(`https://programming-quotes-api.herokuapp.com/Quotes${queryParams}`)
              .flatMap((response) => Effect.tryPromise(response.json()).orDie)
              .flatMap((json) => Effect.fromEither(quotes.decode(json)).orDie)
          }
          case "GetRandomQuote": {
            return fetch(`https://programming-quotes-api.herokuapp.com/Quotes/random`)
              .flatMap((response) => Effect.tryPromise(response.json()).orDie)
              .flatMap((json) => Effect.fromEither(Quote.decode(json)).orDie)
          }
        }
      })
    )
)

export function getQuotes(count: number): Query<FetchService, QuoteNotFoundError, Chunk<Quote>> {
  return Query.fromRequest(GetQuotes({ count }), QuoteDataSource)
}

export const getRandomQuote: Query<FetchService, never, Quote> = Query.fromRequest(
  GetRandomQuote({}),
  QuoteDataSource
)

const query = getQuotes(1)
  .zipBatchedFlatten(getQuotes(2))
  .zipBatchedFlatten(getRandomQuote)

query.run
  .flatMap((tuple) => Effect.succeed(console.log(tuple)))
  .provideLayer(FetchService.live)
  .unsafeRunAsyncWith((exit) => {
    console.log(JSON.stringify(exit, undefined, 2))
  })
