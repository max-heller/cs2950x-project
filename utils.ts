type Apply<F, A, B> = F extends (a: A, b: B) => infer C ? C : never;

type Func<A, B, C> = (a: A, b: B) => C;

export function objMap<O, F extends Func<keyof O, O[keyof O], any>>(obj: O, func:F): {[K in keyof O]: Apply<F, K, O[K]>}  {
    type Result = {[K in keyof O]: Apply<F, K, O[K]>};
    const newObj: Partial<Result> = {};
    for (const key in obj) {
        const value = obj[key];
        const newValue = func(key, value);
        newObj[key] = newValue;
    }

    return newObj as Result;
}

export function objFilter<O, F extends <K extends keyof O>(k: K, v: O[K]) => Boolean>(obj: O, func:F): Partial<O>  {
    const newObj: Partial<O> = {};
    for (const key in obj) {
        const value = obj[key];
        if (func(key, value)) {
            newObj[key] = value;
        }
    }

    return newObj;
}

export function mapMap<K, V1, V2>(map: Map<K, V1>, func: (key: K, value: V1) => V2): Map<K, V2> {
    const newMap: Map<K, V2> = new Map();
    for (const [key, value] of map) {
        newMap.set(key, func(key, value));
    }
    return newMap;
}

export function mapFilter<K, V>(map: Map<K, V>, func: (key: K, value: V) => Boolean): Map<K, V> {
    const newMap: Map<K, V> = new Map();
    for (const [key, value] of map) {
        if (func(key, value)) {
            newMap.set(key, value);
        }
    }
    return newMap;
}

