import { SVGS } from "./svgs"

interface BotStates {
    [state: string]: {
        buttonSVG?: keyof typeof SVGS
        buttonLabel: string
        cantRunReason?: string
    }
}

const _BOT_STATES = {
    "unknown": {
        buttonLabel: "...",
        cantRunReason: "Identifying the bot state"
    },
    "waiting_injection": {
        buttonSVG: "ARROW_FILL",
        buttonLabel: "Run"
    },
    "setup": {
        buttonLabel: "Setting up..",
    },
    "run": {
        buttonSVG: "PAUSE_FILL",
        buttonLabel: "Pause"
    },
    "idle": {
        buttonSVG: "ARROW_FILL",
        buttonLabel: "Run"
    }
} as const;

export const BOT_STATES = _BOT_STATES as BotStates;
export type BotState = keyof typeof _BOT_STATES;