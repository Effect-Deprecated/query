import { literal } from "@effect-ts/core/Function";
import { Request } from "../src/Request";

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
}
