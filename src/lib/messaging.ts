export const MESSAGES = {
    APP: {
        GET_STATE: "get_state",
        INJECTION: "injection",
        TOGGLE: "toggle",
        SYNC_PREFERENCES: "sync_preferences",
        GET_EVERYTHING: "get_everything",
        CLEAR_UNSEEN: "clear_unseen"
    },
    BOT: {
        WARN: "warn",
        ERROR: "error",
        EVENT: "event"
    },
} as const;

export type MessageID = typeof MESSAGES.APP[keyof typeof MESSAGES.APP] | typeof MESSAGES.BOT[keyof typeof MESSAGES.BOT];

export interface Message {
    id: MessageID
    data?: any
};
