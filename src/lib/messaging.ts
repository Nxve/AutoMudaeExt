export const MESSAGES = {
    APP: {
        GET_STATUS: "get_status",
        INJECTION: "injection",
        TOGGLE: "toggle",
        SYNC_PREFERENCES: "sync_preferences",
        GET_EVERYTHING: "get_everything",
        GET_EVENTS: "get_logs",
        CLEAR_UNSEEN: "clear_unseen"
    },
    BOT: {
        WARN: "warn",
        ERROR: "error",
        EVENT: "event",
        SYNC_USER_INFO: "sync_user_info"
    },
} as const;

export type MessageID = typeof MESSAGES.APP[keyof typeof MESSAGES.APP] | typeof MESSAGES.BOT[keyof typeof MESSAGES.BOT];

export interface Message {
    id: MessageID
    data?: any
};
