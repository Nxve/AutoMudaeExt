import { SVGS } from "./svgs";
import { KAKERAS } from "./mudae";

export const NOTIFICATIONS = {
    "foundcharacter": "Found character",
    "claimcharacter": "Claim character",
    "soulmate": "New soulmate",
    "cantclaim": "Can't claim character",
    "wishsteal": "Wish steal",
    "cantroll": "Can't roll and can still marry"
} as const;

export type PrefUseUsers = "logged" | "tokenlist";
export type PrefRollType = "wx" | "wa" | "wg" | "hx" | "ha" | "hg";
export type PrefNotificationType = "sound" | "popup" | "both";
export type PrefNotification = keyof typeof NOTIFICATIONS;
export type PrefLanguage = "en" | "fr" | "es" | "pt-br";
export type PrefReactionType = "reaction" | "button";

export interface Preferences {
    useUsers: PrefUseUsers;
    tokenList: string[];
    languague: PrefLanguage;
    reactionType: PrefReactionType;
    notifications: {
        type: PrefNotificationType
        enabled: Set<PrefNotification>
    }
    roll: {
        enabled: boolean,
        type: PrefRollType
    }
    claim: {
        delay: number
        delayRandom: boolean
    }
    kakera: {
        delay: number
        delayRandom: boolean
        perToken: Map<string, Set<keyof typeof KAKERAS>>
    }
};

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