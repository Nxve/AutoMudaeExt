import type { BotEvent } from "./events";
import { EMOJIS } from "./consts";
import { INTERVAL_SEND_MESSAGE, MUDAE_USER_ID, SLASH_COMMANDS } from "./consts";
import { SVGS } from "./svgs";
import { KAKERAS } from "./mudae";
import { minifyToken, pickRandom } from "./utils";
import type { DiscordMessage } from "./discord";

export type PrefUseUsers = "logged" | "tokenlist";
export type PrefRollType = "wx" | "wa" | "wg" | "hx" | "ha" | "hg";
export type PrefNotificationType = "sound" | "popup" | "both";
export type PrefNotification = keyof typeof NOTIFICATIONS;
export type PrefLanguage = "en" | "fr" | "es" | "pt-br";

export interface Preferences {
    useUsers: PrefUseUsers;
    tokenList: Set<string>;
    languague: PrefLanguage;
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

export interface BotManager {
    state: BotState
    preferences: Preferences | null
    $chat: HTMLElement | null
    info: Map<typeof DISCORD_INFO[keyof typeof DISCORD_INFO], string>
    users: Set<BotUser>
    cdSendMessage: number
    cdGatherInfo: number
    cdRoll: number
    nonce: number
    lastSeenMessageTime: number
    lastResetHash: string
    chatObserver: MutationObserver

    hasNeededInfo(): boolean
    isLastReset(): boolean
    mudaeTimeToMs(time: string): number | null
    getMarriageableUser(preferableUserNicknames?: string[]): BotUser | null
    setup(): Promise<void>
    toggle(): void
    think(): void
    error(message: string): void
    handleHourlyReset(): void
    handleNewChatAppend(nodes: NodeList): void
    getUserWithCriteria(cb: (user: BotUser) => boolean): BotUser | null

    log: {
        warn(message: string): void
        error(message: string, isCritical: boolean): void
        event(eventType: BotEvent, content: any): void
    }

    message: {
        _DiscordMessageCache: Map<string, DiscordMessage | null>
        _MessageAuthorCache: Map<HTMLElement, string | null>
        _fetch: (messageId: string) => Promise<DiscordMessage | null>
        get: (messageId: string) => Promise<DiscordMessage | null>
        getId: ($message: HTMLElement) => string
        getAuthorId: ($message: HTMLElement) => Promise<string | null>
        isFromMudae: ($message: HTMLElement) => Promise<boolean>
        getBotUserWhoSent: ($message: HTMLElement) => Promise<BotUser | null>
        getInteractionUserId: ($message: HTMLElement) => Promise<string | null>
    }

    timers: {
        _t: Map<string, { ref: number, isInterval: boolean }>
        set(identifier: string, callback: Function, ms: number, isInterval?: boolean): void
        clear(): void
    }
}

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
        cantRunReason: ""
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
    },
    "error": {
        buttonSVG: "EXCLAMATION_DIAMOND",
        buttonLabel: "Error",
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

export const DISCORD_INFO = {
    CHANNEL_ID: 'channel_id',
    GUILD_ID: 'guild_id'
} as const;

export const USER_INFO = {
    ROLLS_MAX: "rolls_max",
    ROLLS_LEFT: "rolls_left",
    POWER: "power",
    CAN_RT: "can_rt",
    CAN_MARRY: "can_marry",
    CONSUMPTION: "kakera_consumption"
} as const;

const NEEDED_USER_INFO = [
    USER_INFO.ROLLS_LEFT,
    USER_INFO.ROLLS_MAX,
    USER_INFO.POWER,
    USER_INFO.CAN_RT,
    USER_INFO.CAN_MARRY,
    USER_INFO.CONSUMPTION
] as const;

export class BotUser {
    manager: BotManager
    info: Map<typeof USER_INFO[keyof typeof USER_INFO], unknown>
    token: string
    id?: string
    username?: string
    avatar?: string
    nick?: string
    sendTUTimer?: any /// number, but typescript is complaining

    constructor(botManager: BotManager, token: string, id?: string, username?: string, avatar?: string) {
        this.manager = botManager;
        this.token = token;
        this.info = new Map();

        if (id && username && avatar) {
            this.id = id;
            this.username = username;
            this.avatar = avatar;
        }
    }

    async init(): Promise<Error | void> {
        return new Promise<Error | void>(async (resolve) => {
            if (this.id && this.username && this.avatar) {
                const err = await this.fetchNick();

                resolve(err);
                return;
            }

            fetch("https://discord.com/api/v9/users/@me", { "headers": { "authorization": this.token } })
                .then(response => response.json())
                .then(async (data) => {
                    const minifiedToken = minifyToken(this.token);

                    if (!Object.hasOwn(data, "id") || !Object.hasOwn(data, "username") || !Object.hasOwn(data, "avatar")) {
                        throw Error(`Couldn't retrieve info about the token [${minifiedToken}]`);
                    }

                    this.id = data.id;
                    this.username = data.username;
                    this.avatar = data.avatar;

                    if (this.avatar == null) {
                        throw Error(`Token [${minifiedToken}] must have a custom avatar`);
                    }

                    const err = await this.fetchNick();

                    resolve(err);
                })
                .catch(resolve);
        });
    }

    async fetchNick(): Promise<Error | void> {
        return new Promise<Error | void>(resolve => {
            const guildId = window.location.pathname.split("/")[2];

            fetch(`https://discord.com/api/v9/users/${this.id}/profile?guild_id=${guildId}`, {
                "headers": {
                    "authorization": this.token
                }
            })
                .then(response => response.json())
                .then(data => {
                    if (!Object.hasOwn(data, "guild_member")) {
                        throw Error(`Token ${minifyToken(this.token)} must be a member of this guild`);
                    }

                    const { guild_member: { nick } } = data;
                    this.nick = nick;

                    resolve();
                })
                .catch(resolve);
        });
    }

    hasNeededInfo(): boolean {
        return NEEDED_USER_INFO.every(info => this.info.has(info), this);
    }

    async sendChannelMessage(message: string): Promise<Error | void> {
        return new Promise<Error | void>((resolve) => {
            const channelId = this.manager.info.get(DISCORD_INFO.CHANNEL_ID);

            if (!channelId) {
                resolve(Error("Unknown channel ID"));
                return;
            }

            const now = performance.now();

            if (now - this.manager.cdSendMessage < INTERVAL_SEND_MESSAGE) {
                resolve(Error("Cooldown"));
                return;
            }

            this.manager.cdSendMessage = now;

            fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
                "method": "POST",
                "headers": {
                    "authorization": this.token,
                    "content-type": "application/json"
                },
                "body": `{"content":"${message || '?'}","nonce":"${++this.manager.nonce}","tts":false}`
            })
                .then(() => resolve())
                .catch(resolve);

        })
    }

    async reactToMessage($message: HTMLElement, emoji?: string): Promise<Error | void> {
        return new Promise<Error | void>((resolve) => {
            const channelId = this.manager.info.get(DISCORD_INFO.CHANNEL_ID);
            const messageId = this.manager.message.getId($message);

            if (!channelId) {
                resolve(Error("Unknown channel ID"));
                return;
            }

            if (!messageId) {
                resolve(Error("Unknown message ID"));
                return;
            }

            emoji = emoji || pickRandom([...Object.values(EMOJIS)]);

            fetch(`https://discord.com/api/v9/channels/${channelId}/messages/${messageId}/reactions/${emoji}/%40me`, {
                "method": "PUT",
                "headers": {
                    "authorization": this.token,
                }
            })
                .then(() => resolve())
                .catch(resolve);
        });
    }

    async roll(): Promise<Error | void> {
        return new Promise((resolve) => {
            if (!this.manager.preferences) {
                resolve(Error("Unknown preferences."));
                return;
            }

            const guildId = this.manager.info.get(DISCORD_INFO.GUILD_ID);
            const channelId = this.manager.info.get(DISCORD_INFO.CHANNEL_ID);

            if (!guildId || !channelId) {
                resolve(Error("Unknown guild or channel ID."));
                return;
            }

            const rollType = this.manager.preferences.roll.type;
            const command = SLASH_COMMANDS[rollType];

            fetch("https://discord.com/api/v9/interactions", {
                "method": "POST",
                "headers": {
                    "authorization": this.token,
                    "content-type": "multipart/form-data; boundary=----BDR",
                },
                "body": `------BDR\r\nContent-Disposition: form-data; name="payload_json"\r\n\r\n{"type":2,"application_id":"${MUDAE_USER_ID}","guild_id":"${guildId}","channel_id":"${channelId}","session_id":"${++this.manager.nonce}","data":{"version":"${command.version}","id":"${command.id}","name":"${rollType}","type":1},"nonce":"${this.manager.nonce}"}\r\n------BDR--\r\n`
            })
                .then(() => resolve())
                .catch(resolve);
        });
    }

    setTUTimer(ms: number) {
        if (this.sendTUTimer) clearTimeout(this.sendTUTimer);

        this.sendTUTimer = setTimeout((user: BotUser) => {
            user.sendChannelMessage("$tu");
        }, ms, this);
    }
};

export const defaultPreferences = (): Preferences => ({
    useUsers: "logged",
    tokenList: new Set(),
    languague: "en",
    notifications: {
        type: "sound",
        enabled: new Set()
    },
    roll: {
        enabled: true,
        type: "wx"
    },
    claim: {
        delay: 0,
        delayRandom: false
    },
    kakera: {
        delay: .1,
        delayRandom: false,
        perToken: new Map([["all", new Set()]])
    }
});