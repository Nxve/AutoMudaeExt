export const MESSAGES = {
    GET_STATE: "get_state"
} as const;

export interface Message {
    id: typeof MESSAGES[keyof typeof MESSAGES]
    data?: any
};