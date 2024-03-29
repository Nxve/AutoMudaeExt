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

export const pickRandom = <T>(arr: T[]): T => arr[arr.length * Math.random() | 0];

export const minifyToken = (token: string): string => token.slice(0, 7) + "..." + token.slice(-7);

export const randomFloat = (min: number, max: number, decimals: number): number => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

export const dateToHMS = (date: Date): string => date.toTimeString().split(" ")[0];

export const randomChar = (fromString: string) => fromString.charAt(Math.floor(Math.random() * fromString.length));

export const randomSessionID = (): string => {
    const base = "aaaa000000a00000000a00a0aaaa0a00";
    const letters = "abcdef";
    const output: string[] = [];

    for (let i = 0; i < base.length; i++) {
        const currentChar = base.charAt(i);

        const randomChar: string = currentChar === '0' ?
            Math.floor(Math.random() * 10).toString() :
            letters.charAt(Math.floor(Math.random() * letters.length));

        output.push(randomChar);
    }

    return output.join('');
};

export const reduceInnerArraysLength = (total: number, current: unknown[]) => total + current.length;

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(() => resolve(), ms));

export const getPeriodHash = (date: Date, intervalMinute: number): string => {
    const start = new Date(date);

    start.setMinutes(intervalMinute, 0, 0);

    if (start.getTime() > date.getTime()) {
        start.setHours(date.getHours() - 1);
    }

    return start.getTime().toString();
}

export const getClipboard = (): string | null => {
    const $input = document.createElement("input");

    document.body.appendChild($input);

    $input.focus();

    document.execCommand("paste");

    const content = $input.value.trim();

    $input.blur();

    document.body.removeChild($input);

    return content || null;
};

export const setClipboard = (text: string) => {
    const $textArea = document.createElement("textarea");

    $textArea.textContent = text;

    document.body.appendChild($textArea);

    $textArea.select();

    document.execCommand('copy');

    $textArea.blur();

    document.body.removeChild($textArea);
};

export const replaceProperties = (objectA: any, objectB: any) => {
    for (const key in objectA) {
        if (objectA.hasOwnProperty(key)) {
            const typeA = typeof objectA[key];
            const typeB = typeof objectB[key];

            if (objectB.hasOwnProperty(key) && typeA === typeB) {
                if (typeA === "object" && objectA[key] instanceof Set) {
                    if (objectB[key] instanceof Set) {
                        objectA[key] = new Set(objectB[key]);
                    }
                } else if (typeA === "object" && objectA[key] instanceof Map) {
                    if (objectB[key] instanceof Map) {
                        objectA[key] = new Map(objectB[key]);
                    }
                } else if (typeA === "object" && !Array.isArray(objectA[key]) && !Array.isArray(objectB[key])) {
                    replaceProperties(objectA[key], objectB[key]);
                } else {
                    objectA[key] = objectB[key];
                }
            }
        }
    }
}