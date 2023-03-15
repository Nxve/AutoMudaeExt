export const MUDAE_USER_ID = "432610292342587392";
export const INTERVAL_SEND_MESSAGE = 1500;
export const INTERVAL_THINK = 200;
export const INTERVAL_ROLL = 2000;

export const EMOJIS = {
    '💓': '%F0%9F%92%93',
    '💕': '%F0%9F%92%95',
    '💖': '%F0%9F%92%96',
    '💗': '%F0%9F%92%97',
    '💘': '%F0%9F%92%98',
    '❤️': '%E2%9D%A4%EF%B8%8F',
    '❣️': '%E2%9D%A3%EF%B8%8F',
    '💞': '%F0%9F%92%9E',
    '♥️': '%E2%99%A5%EF%B8%8F'
} as const;

export const SLASH_COMMANDS = {
    "wx": { version: "832172261968314389", id: "832172261968314388" },
    "wa": { version: "832172151729422418", id: "832172151729422417" },
    "wg": { version: "832172216665374751", id: "832172216665374750" },
    "hx": { version: "832172373536669707", id: "832172373536669706" },
    "ha": { version: "832172457028747337", id: "832172457028747336" },
    "hg": { version: "832172416192872459", id: "832172416192872458" },
} as const;

export type EMOJI = typeof EMOJIS[keyof typeof EMOJIS];