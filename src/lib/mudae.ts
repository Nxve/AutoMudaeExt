const KAKERAS = {
    PURPLE: {
        internalName: "kakeraP",
        imgSrc: "609264156347990016",
        emoji: ''
    },
    BLUE: {
        internalName: "kakera",
        imgSrc: "469791929106956298",
        emoji: ''
    },
    CYAN: {
        internalName: "kakeraT",
        imgSrc: "609264180851376132",
        emoji: ''
    },
    GREEN: {
        internalName: "kakeraG",
        imgSrc: "609264166381027329",
        emoji: ''
    },
    YELLOW: {
        internalName: "kakeraY",
        imgSrc: "605112931168026629",
        emoji: ''
    },
    ORANGE: {
        internalName: "kakeraO",
        imgSrc: "605112954391887888",
        emoji: ''
    },
    RED: {
        internalName: "kakeraR",
        imgSrc: "605112980295647242",
        emoji: ''
    },
    RAINBOW: {
        internalName: "kakeraW",
        imgSrc: "608192076286263297",
        emoji: ''
    },
    LIGHT: {
        internalName: "kakeraL",
        imgSrc: "815961697918779422",
        emoji: ''
    }
};

const SLASH_COMMANDS = {
    "wx": { version: "832172261968314389", id: "832172261968314388" },
    "wa": { version: "832172151729422418", id: "832172151729422417" },
    "wg": { version: "832172216665374751", id: "832172216665374750" },
    "hx": { version: "832172373536669707", id: "832172373536669706" },
    "ha": { version: "832172457028747337", id: "832172457028747336" },
    "hg": { version: "832172416192872459", id: "832172416192872458" },
    "tu": { version: "832171928072224790", id: "832171928072224789" },
    "daily": { version: "947059341406638110", id: "946747833032261662" }
} as const;

export type SlashCommand = keyof typeof SLASH_COMMANDS;

export type KAKERA = keyof typeof KAKERAS;

for (const _kakera in KAKERAS) {
    const kakera = _kakera as KAKERA;

    KAKERAS[kakera].emoji = `${KAKERAS[kakera].internalName}%3A${KAKERAS[kakera].imgSrc}`;
}

export { KAKERAS, SLASH_COMMANDS }
