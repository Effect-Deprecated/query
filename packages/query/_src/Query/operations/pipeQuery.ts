/**
 * @tsplus operator effect/query/Query /
 * @tsplus fluent effect/query/Query apply
 * @tsplus macro pipe
 */
export function pipeQuery<A, B>(a: A, f: (a: A) => B): B {
  return f(a)
}
