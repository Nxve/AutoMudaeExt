export type LogType = typeof LOG_TYPES[keyof typeof LOG_TYPES];

export interface BotLog {
    time: string
    type: LogType
};

export type WarnLog = BotLog & {
    content: string
};

export type ErrorLog = BotLog & {
    content: { message: string, isCritical: boolean }
};

export type EventLog = BotLog & {
    content: { eventType: BotEvent, eventData: any }
};

export interface Logs {
    events: EventLog[]
    warns: WarnLog[]
    errors: ErrorLog[]
};

export interface Stats {
    characters: {
        [username: string]: string[]
    }
    soulmates: {
        [username: string]: string[]
    }
    steals: { character: string | null, user: string | null }[]
    kakera: {
        perType: {
            [kakeraInternalName: string]: number
        }
        amount: {
            [username: string]: number
        }
    }
};

export type Unseen = {
    [T in LogType]: number;
};

export type BotEvent = typeof EVENTS[keyof typeof EVENTS];

export const EVENTS = {
    STEAL: "steal",
    CLAIM: "claim",
    KAKERA: "kakera",
    SOULMATE: "soulmate",
    FOUND_CHARACTER: "found_character"
} as const;

export const LOG_TYPES = {
    EVENT: "event",
    WARN: "warn",
    ERROR: "error"
} as const;

export const LOG_BADGE_COLORS = {
    event: "#d6d6d6",
    warn: "#d1d446",
    error: "#ff5757"
} as const;

export const blankLogs = (): Logs => ({
    events: [],
    warns: [],
    errors: []
});

export const blankStats = (): Stats => ({
    characters: {},
    soulmates: {},
    steals: [],
    kakera: {
        perType: {},
        amount: {}
    }
});

export const blankUnseen = (): Unseen => ({
    event: 0,
    warn: 0,
    error: 0
});