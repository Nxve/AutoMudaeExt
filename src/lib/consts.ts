/// Bot
export const VERSION_PREFERENCES = 1;
export const INTERVAL_GATHER_INFO = 1000;
export const INTERVAL_SEND_MESSAGE = 1500;
export const INTERVAL_THINK = 200;
export const INTERVAL_ROLL = 1500;
export const INTERVAL_DONT_ROLL_AFTER_ACTIVITY = 2000;

/// Discord
export const DISCORD_NICK_MIN = 1;
export const DISCORD_NICK_MAX = 32;
export const DISCORD_EMBED_FIELD_MIN = 1;
export const DISCORD_EMBED_FIELD_MAX = 256;

/// Mudae
export const MUDAE_USER_ID = "432610292342587392";
export const MUDAE_SILVERIV_KAKERA_BONUS = 200;
export const MUDAE_CLAIM_RESET_MIN = 60;
export const MUDAE_CLAIM_RESET_MAX = 600;
export const MUDAE_CLAIM_RESET_DEFAULT = 180;
export const MUDAE_KAKERALOOTS_MAX = 100;

/// Emojis
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