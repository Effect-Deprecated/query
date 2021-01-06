import { Cause } from '@effect-ts/system/Cause'
import {} from '@effect-ts/system/Effect/Con'
import { BlockedRequests } from './BlockedRequests'

class Blocked<R, E, A>{
    readonly _tag = 'Blocked'
    readonly _R!: (r: R) => never
    readonly _E!: () => E
    readonly _A!: () => A
}
class Done<A> {
    readonly _tag = 'Done'
    readonly _A!: () => A
    constructor(
        public readonly value: A
    ){}
}
class Fail<E>{
    readonly _tag = 'Fail'
    readonly _E!: () => E
    constructor(
        public readonly cause: Cause<E>
    ){}
}

export type Result<R, E, A> = Blocked<R, E, A> | Done<A> | Fail<E>

  /**
   * Constructs a result that is blocked on the specified requests with the
   * specified continuation.
   */
  export function blocked<R, E, A>(blockedRequests: BlockedRequests<R>, cont: Continue<R, E, A>): Result<R, E, A> {
      return new Blocked(blockedRequests, cont)
  }

  /**
   * Constructs a result that is done with the specified value.
   */
  export function done<A>(value: A): Result<unknown, never, A> { return new Done(value) }

  /**
   * Constructs a result that is failed with the specified `Cause`.
   */
  export function fail<E>(cause: Cause<E>): Result<unknown, E, never> {
      return new Fail(cause)
  }