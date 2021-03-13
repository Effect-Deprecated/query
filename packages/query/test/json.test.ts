import { stringify } from "../src/Internal/Json"

describe("Json", () => {
  it("should stringify stable", () => {
    const str = '{"a":0,"b":1,"c":2,"d":"7","f":{"r":"[symbol]"},"z":"[function]"}'
    expect(
      stringify({ z: () => 0, a: 0, f: { r: Symbol() }, b: 1, d: BigInt(7), c: 2 })
    ).toEqual(str)
    expect(
      stringify({ c: 2, a: 0, b: 1, d: BigInt(7), z: () => 0, f: { r: Symbol() } })
    ).toEqual(str)
  })
})
