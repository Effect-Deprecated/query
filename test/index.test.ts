import { literal } from "@effect-ts/core/Function";
import * as H from "@effect-ts/core/Common/Hash";
import * as T from "@effect-ts/core/Effect";
import { Request } from "../src/Request";
import * as DS from "../src/DataSource";

export class GetUserError {
  readonly _tag = literal("GetUserError");
  constructor(readonly error: Error) {}
}

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
}

export class GetUser extends Request<GetUserError, User> {
  _tag = literal("GetUser");

  constructor(readonly userId: string) {
    super();
  }

  equals(that: this): boolean {
    return that.userId === this.userId;
  }

  hash(): number {
    return H.string(`GetUser(${this.userId})`);
  }
}

export interface Product {
  productId: string;
  title: string;
  description: string;
}

export class GetProductError {
  readonly _tag = literal("GetProductError");
  constructor(readonly error: Error) {}
}

export class GetProduct extends Request<GetProductError, Product> {
  _tag = literal("GetProduct");

  constructor(readonly productId: string) {
    super();
  }

  equals(that: this): boolean {
    return that.productId === this.productId;
  }

  hash(): number {
    return H.string(`GetProduct(${this.productId})`);
  }
}

export interface GetUserEnv {
  first: string;
  last: string;
}

export const testUserDS = DS.fromFunctionBatchedM("TestUsers")(
  (_: readonly GetUser[]) =>
    T.access((r: GetUserEnv) =>
      _.map((_) => ({
        firstName: `${r.first}: ${_.userId}`,
        lastName: `${r.last}: ${_.userId}`,
        userId: _.userId,
      }))
    )
)["@"](
  DS.provideSome("TestUsersEnvironment", () => ({
    first: "firstName",
    last: "lastName",
  }))
);

export const testProductDS = DS.fromFunctionBatched("TestProducts")<GetProduct>(
  (_) =>
    _.map((_) => ({
      description: `description: ${_.productId}`,
      title: `title: ${_.productId}`,
      productId: _.productId,
    }))
);
