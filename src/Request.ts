
export abstract class Request<E,A>{
    readonly _tag = 'Request'
    readonly _E!: () => E
    readonly _A!: () => A
}