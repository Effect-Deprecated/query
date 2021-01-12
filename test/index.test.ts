import * as T from "@effect-ts/core/Effect";
import { literal } from "@effect-ts/core/Function";
import * as DS from "../src/DataSource";
import { IdentifiedRequest, eqSymbol } from "../src/Request";

export class GetUserError {
  readonly _tag = literal("GetUserError");
  constructor(readonly error: Error) {}
}

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
}

export class GetUser extends IdentifiedRequest<GetUserError, User> {
  readonly _tag = "GetUser";
  readonly identifier = `GetUser(${this.userId})`;

  constructor(readonly userId: string) {
    super();
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

export class GetProduct extends IdentifiedRequest<GetProductError, Product> {
  readonly _tag = "GetProduct";
  readonly identifier = `GetProduct(${this.productId})`;

  constructor(readonly productId: string) {
    super();
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

console.log(new GetUser("efjnwejfje")[eqSymbol](new GetUser("efjnwejfje")));
