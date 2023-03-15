export const MESSAGES = {
    GET_STATE: "get_state",
    INJECTION: "injection",
    TOGGLE: "toggle"
} as const;

export type MessageID = typeof MESSAGES[keyof typeof MESSAGES];

export interface Message {
    id: MessageID
    data?: any
};
