import type { Endomorphism } from "@tsplus/stdlib/data/Function"

export const currentCache: FiberRef<Cache, Endomorphism<Cache>> = FiberRef.unsafeMake(
  Cache.unsafeMake()
)
