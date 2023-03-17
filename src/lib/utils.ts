export const isTokenValid = (token: string) => token && token.length >= 70 && token.length < 80 && /\w+\.\w+\.[-\w]+$/.test(token);

export const jsonMapSetReviver = (_k: any, v: any) => {
    if (typeof v === "object" && v !== null) {
        if (v.dataType === "Map") {
            return new Map(v.value);
        } else if (v.dataType === "Set") {
            return new Set(v.value);
        }
    }
    return v;
}

export const jsonMapSetReplacer = (_k: any, v: any) => {
    const isMap = v instanceof Map, isSet = v instanceof Set;

    if (isMap || isSet) {
        return {
            dataType: isMap ? "Map" : "Set",
            value: [...v]
        };
    }
    return v;
}

export const getLastFromArray = (array: any[]) => array[array.length - 1];

export const pickRandom = (arr: any[]) => arr[arr.length * Math.random() | 0];

export const minifyToken = (token: string) => token.slice(0, 7) + "..." + token.slice(-7);

export const randomFloat = (min: number, max: number, decimals: number) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);