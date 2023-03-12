import { SVGS } from "./svgs";
import { KAKERAS } from "./mudae";

export type PrefUseUsers = "logged" | "tokenlist";
export type PrefRollType = "wx" | "wa" | "wg" | "hx" | "ha" | "hg";
export type PrefNotificationType = "sound" | "popup" | "both";
export type PrefNotification = keyof typeof NOTIFICATIONS;
export type PrefLanguage = "en" | "fr" | "es" | "pt-br";
export type PrefReactionType = "reaction" | "button";

export interface Preferences {
    useUsers: PrefUseUsers;
    tokenList: Set<string>;
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
        cantRunReason: string
    }
};

export type BotState = keyof typeof _BOT_STATES;

const _BOT_STATES = {
    "unknown": {
        buttonLabel: "...",
        cantRunReason: "Identifying the bot state"
    },
    "waiting_injection": {
        buttonSVG: "ARROW_FILL",
        buttonLabel: "Run",
        cantRunReason: "<dynamic>"
    },
    "setup": {
        buttonLabel: "Setting up..",
        cantRunReason: "Wait until it sets up"
    },
    "running": {
        buttonSVG: "PAUSE_FILL",
        buttonLabel: "Pause",
        cantRunReason: "<dynamic>"
    },
    "idle": {
        buttonSVG: "ARROW_FILL",
        buttonLabel: "Run",
        cantRunReason: "<dynamic>"
    },
    "injection_error": {
        buttonSVG: "EXCLAMATION_DIAMOND",
        buttonLabel: "Injection error",
        cantRunReason: "<dynamic>"
    }
} as const;

export const BOT_STATES = _BOT_STATES as BotStates;

export const NOTIFICATIONS = {
    "foundcharacter": "Found character",
    "claimcharacter": "Claim character",
    "soulmate": "New soulmate",
    "cantclaim": "Can't claim character",
    "wishsteal": "Wish steal",
    "cantroll": "Can't roll and can still marry"
} as const;

export class BotUser {
    info: Map<any, any>
    token: string
    id?: number
    username?: string
    avatar?: string
    nick?: string

    constructor(token: string, id?: number, username?: string, avatar?: string) {
        this.token = token;
        this.info = new Map();
        
        if (id && username && avatar){
            this.id = id;
            this.username = username;
            this.avatar = avatar;
        }
    }

    async init(): Promise<Error | void> {
        return new Promise<Error | void>(async (resolve) => {
            if (this.id && this.username && this.avatar){
                const err = await this.fetchNick();
    
                resolve(err);
                return;
            }

            fetch("https://discord.com/api/v9/users/@me", { "headers": { "authorization": this.token } })
                .then(response => response.json())
                .then(async (data) => {
                    if (!Object.hasOwn(data, "id") || !Object.hasOwn(data, "username") || !Object.hasOwn(data, "avatar")){
                        resolve(Error(`Couldn't retrieve info about the token [${this.token.slice(0, 7)}...${this.token.slice(-7)}]`))
                        return;
                    }

                    this.id = data.id;
                    this.username = data.username;
                    this.avatar = data.avatar;

                    const err = await this.fetchNick();

                    resolve(err);
                })
                .catch(resolve);
        });
    }

    fetchNick(): Promise<Error | void> {
        return new Promise<Error | void>(resolve => {
            const guildId = window.location.pathname.split("/")[2];

            fetch(`https://discord.com/api/v9/users/${this.id}/profile?guild_id=${guildId}`, {
                "headers": {
                    "authorization": this.token
                }
            })
                .then(response => response.json())
                .then(data => {
                    const { guild_member: { nick } } = data;
                    this.nick = nick;

                    resolve();
                })
                .catch(resolve);
        });
    }
}

