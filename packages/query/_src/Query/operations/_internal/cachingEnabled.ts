import type { Endomorphism } from "@tsplus/stdlib/data/Function"

export const cachingEnabled: FiberRef<boolean, Endomorphism<boolean>> = FiberRef.unsafeMake(true)
