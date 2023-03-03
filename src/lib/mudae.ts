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

for (const _kakera in KAKERAS) {
    const kakera = _kakera as keyof typeof KAKERAS;

    KAKERAS[kakera].emoji = `${KAKERAS[kakera].internalName}%3A${KAKERAS[kakera].imgSrc}`;
}

export { KAKERAS }
