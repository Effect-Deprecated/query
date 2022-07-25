/**
 * @tsplus type effect/query/test/Sources
 */
export interface Sources {}
export const Sources: Sources = {}

export interface Bearer extends Case {
  readonly value: string
}
export const Bearer = Case.of<Bearer>()

export interface User extends Case {
  readonly id: number
  readonly name: string
  readonly addressId: number
  readonly paymentId: number
}
export const User = Case.of<User>()

export interface Address extends Case {
  readonly id: number
  readonly street: string
}
export const Address = Case.of<Address>()

export interface Payment extends Case {
  readonly id: number
  readonly name: string
}
export const Payment = Case.of<Payment>()

/**
 * @tsplus static effect/query/test/Sources totalCount
 */
export const totalCount = 15_000

export const paymentData: HashMap<number, Payment> = HashMap.from(
  Chunk.fill(totalCount, (id) => Tuple(id, Payment({ id, name: "payment name" })))
)

export interface GetPayment extends Request<never, Payment> {
  readonly id: number
}
export const GetPayment = Request.of<GetPayment>()

export const paymentSource: DataSource<never, GetPayment> = DataSource
  .fromFunctionBatchedMaybeEffect(
    "PaymentSource",
    (requests) => Effect.succeed(requests.map((request) => paymentData.get(request.id)))
  )

/**
 * @tsplus static effect/query/test/Sources getPayment
 */
export function getPayment(id: number): Query<never, never, Payment> {
  return Query.fromRequest(GetPayment({ id }), paymentSource)
}

export const addressData: HashMap<number, Address> = HashMap.from(
  Chunk.fill(totalCount, (id) => Tuple(id, Address({ id, street: "street" })))
)

export interface GetAddress extends Request<never, Address> {
  readonly id: number
}
export const GetAddress = Request.of<GetAddress>()

export const addressSource: DataSource<never, GetAddress> = DataSource
  .fromFunctionBatchedMaybeEffect(
    "AddressSource",
    (requests) => Effect.succeed(requests.map((request) => addressData.get(request.id)))
  )

/**
 * @tsplus static effect/query/test/Sources getAddress
 */
export function getAddress(id: number): Query<never, never, Address> {
  return Query.fromRequest(GetAddress({ id }), addressSource)
}
