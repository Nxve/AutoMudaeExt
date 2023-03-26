import type { BotEvent } from "./event";

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

export type Unseen = {
    [T in LogType]: number;
};

export const LOG_TYPES = {
    EVENT: "event",
    WARN: "warn",
    ERROR: "error"
} as const;

export const LOG_BADGE_COLORS = {
    event: "#d6d6d6",
    warn: "#fcff69",
    error: "#ff5757"
} as const;

export const blankLogs = (): Logs => ({
    events: [],
    warns: [],
    errors: []
});

export const blankUnseen = (): Unseen => ({
    event: 0,
    warn: 0,
    error: 0
});