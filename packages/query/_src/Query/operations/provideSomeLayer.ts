/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @tsplus static effect/query/Query.Aspects provideSomeLayer
 * @tsplus pipeable effect/query/Query provideSomeLayer
 */
export function provideSomeLayer<R0, E2, A1>(
  layer: LazyArg<Described<Layer<R0, E2, A1>>>
) {
  return <R, E, A>(self: Query<R, E, A>): Query<R0 | Exclude<R, A1>, E | E2, A> =>
    Query.succeed(layer).flatMap((layer) =>
      // @ts-expect-error
      self.provideLayer(
        Described(Layer.environment<Exclude<R, A1>>().provideTo(layer.value), layer.description)
      )
    )
}
