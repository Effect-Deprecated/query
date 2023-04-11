import * as Chunk from "@effect/data/Chunk"
import * as Data from "@effect/data/Data"
import { pipe } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import * as Effect from "@effect/io/Effect"
import * as DataSource from "@effect/query/DataSource"
import * as Query from "@effect/query/Query"
import * as Request from "@effect/query/Request"

export interface Bearer extends Data.Case {
  readonly value: string
}
export const Bearer = Data.case<Bearer>()

export interface User extends Data.Case {
  readonly id: number
  readonly name: string
  readonly addressId: number
  readonly paymentId: number
}
export const User = Data.case<User>()

export interface Address extends Data.Case {
  readonly id: number
  readonly street: string
}
export const Address = Data.case<Address>()

export interface Payment extends Data.Case {
  readonly id: number
  readonly name: string
}
export const Payment = Data.case<Payment>()

export const totalCount = 15_000

export const paymentData: HashMap.HashMap<number, Payment> = HashMap.fromIterable(
  Array.from(
    { length: totalCount },
    (_, id) => [id, Payment({ id, name: "payment name" })]
  )
)

export interface GetPayment extends Request.Request<never, Payment> {
  readonly id: number
}
export const GetPayment = Request.of<GetPayment>()

export const PaymentDataSource: DataSource.DataSource<never, GetPayment> = DataSource
  .fromFunctionBatchedOptionEffect((requests) =>
    Effect.succeed(pipe(
      requests,
      Chunk.map((request) => pipe(paymentData, HashMap.get(request.id)))
    ))
  )

export const getPayment = (id: number): Query.Query<never, never, Payment> =>
  Query.fromRequest(GetPayment({ id }), PaymentDataSource)

export const addressData: HashMap.HashMap<number, Address> = HashMap.fromIterable(
  Array.from(
    { length: totalCount },
    (_, id) => [id, Address({ id, street: "street" })]
  )
)

export interface GetAddress extends Request.Request<never, Address> {
  readonly id: number
}
export const GetAddress = Request.of<GetAddress>()

export const AddressDataSource: DataSource.DataSource<never, GetAddress> = DataSource
  .fromFunctionBatchedOptionEffect((requests) =>
    Effect.succeed(
      pipe(
        requests,
        Chunk.map((request) => pipe(addressData, HashMap.get(request.id)))
      )
    )
  )

export const getAddress = (id: number): Query.Query<never, never, Address> =>
  Query.fromRequest(GetAddress({ id }), AddressDataSource)
