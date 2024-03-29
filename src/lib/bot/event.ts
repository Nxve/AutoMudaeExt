
export type BotEvent = typeof EVENTS[keyof typeof EVENTS];

export const EVENTS = {
    STEAL: "steal",
    CLAIM: "claim",
    KAKERA: "kakera",
    KAKERA_SILVERIV: "kakera_silveriv",
    SOULMATE: "soulmate",
    FOUND_CHARACTER: "found_character"
} as const;