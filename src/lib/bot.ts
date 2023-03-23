import type { BotEvent } from "./events";
import { INTERVAL_SEND_MESSAGE, MUDAE_USER_ID, SLASH_COMMANDS } from "./consts";
import { SVGS } from "./svgs";
import { KAKERAS } from "./mudae";
import { minifyToken } from "./utils";
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
    sessionID: string
    lastSeenMessageTime: number
    lastResetHash: string
    chatObserver: MutationObserver
    lastErrorMessage?: string

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
        get: (message: string | HTMLElement) => Promise<DiscordMessage | null>
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

    async init(): Promise<void> {
        if (this.id && this.username && this.avatar) {
            await this.fetchNick();
            return;
        }

        let userData: any;
        const minifiedToken = minifyToken(this.token);

        try {
            const response = await fetch("https://discord.com/api/v9/users/@me", { "headers": { "authorization": this.token } })

            userData = await response.json();
        } catch (error) {
            console.error(`Error while fetching user data for token [${minifiedToken}]`, error);
            throw Error(`Couldn't retrieve info about the token [${minifiedToken}]. Check console for more info`);
        }

        if (!Object.hasOwn(userData, "id") || !Object.hasOwn(userData, "username") || !Object.hasOwn(userData, "avatar")) {
            throw Error(`Malformed response from Discord API for token [${minifiedToken}]`);
        }

        this.id = userData.id;
        this.username = userData.username;
        this.avatar = userData.avatar;

        if (this.avatar == null) {
            throw Error(`Token [${minifiedToken}] must have a custom avatar`);
        }

        await this.fetchNick();
    }

    async fetchNick(): Promise<void> {
        const guildId = window.location.pathname.split("/")[2];

        let userData: any;

        try {
            const response = await fetch(`https://discord.com/api/v9/users/${this.id}/profile?guild_id=${guildId}`, {
                "headers": {
                    "authorization": this.token
                }
            });

            userData = await response.json();
        } catch (error: any) {
            throw Error(`Couldn't fetch user nick for token [${minifyToken(this.token)}]: ${error.message}`);
        }

        if (!Object.hasOwn(userData, "guild_member")) {
            throw Error(`Token [${minifyToken(this.token)}] must be a member of this guild`);
        }

        const { guild_member: { nick } } = userData;
        this.nick = nick;
    }

    hasNeededInfo(): boolean {
        return NEEDED_USER_INFO.every(info => this.info.has(info), this);
    }

    async sendChannelMessage(message: string): Promise<void> {
        const channelId = this.manager.info.get(DISCORD_INFO.CHANNEL_ID);

        if (!channelId) throw Error("Unknown channel ID");

        const now = performance.now();

        if (now - this.manager.cdSendMessage < INTERVAL_SEND_MESSAGE) {
            return; /// Silent failure. Throwing it would log as an error.
        }

        this.manager.cdSendMessage = now;

        try {
            await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
                "method": "POST",
                "headers": {
                    "authorization": this.token,
                    "content-type": "application/json"
                },
                "body": `{"content":"${message || '?'}","nonce":"${++this.manager.nonce}","tts":false}`
            });
        } catch (error) {
            console.error("Error while sending Discord message", error);
            throw Error("Couldn't send a Discord message. Check console for more info.");
        }
    }

    async pressMessageButton($message: HTMLElement): Promise<void> {
        const messageId = this.manager.message.getId($message);
        const guildId = this.manager.info.get("guild_id") as string;
        const channelId = this.manager.info.get("channel_id") as string;

        if (!messageId) throw Error("Unknown message ID.");
        if (!guildId) throw Error("Unknown guild ID.");
        if (!channelId) throw Error("Unknown channel ID.");

        let message: DiscordMessage | null | undefined;

        try {
            message = await this.manager.message.get(messageId);
        } catch (error) {
            console.error("Error while fetching discord message", $message, error);
            throw Error("Couldn't fetch the Discord message. Check console for more info.");
        }

        if (!message) throw Error("Couldn't fetch the Discord message.");

        const componentWrapper = message.components[0];

        if (!componentWrapper || componentWrapper.components.length < 1) throw Error("No button was found to press.");

        const component = componentWrapper.components[0];

        try {
            await fetch("https://discord.com/api/v9/interactions", {
                "headers": {
                    "authorization": this.token,
                    "content-type": "application/json"
                },
                "body": `{"type":3,"nonce":"${++this.manager.nonce}","guild_id":"${guildId}","channel_id":"${channelId}","message_flags":0,"message_id":"${messageId}","application_id":"${MUDAE_USER_ID}","session_id":"${this.manager.sessionID}","data":{"component_type":${component.type},"custom_id":"${component.custom_id}"}}`,
                "method": "POST"
            });
        } catch (error) {
            console.error("Error while interacting with Discord message button", $message, error);
            throw Error("Couldn't interact with the button. Check console for more info.");
        }
    }

    async roll(): Promise<void> {
        if (!this.manager.preferences) {
            throw Error("Unknown preferences.")
        }

        const guildId = this.manager.info.get(DISCORD_INFO.GUILD_ID);
        const channelId = this.manager.info.get(DISCORD_INFO.CHANNEL_ID);

        if (!guildId) {
            throw Error("Unknown guild ID.");
        }
        if (!channelId) {
            throw Error("Unknown channel ID.");
        }

        const rollType = this.manager.preferences.roll.type;
        const command = SLASH_COMMANDS[rollType];

        try {
            fetch("https://discord.com/api/v9/interactions", {
                "method": "POST",
                "headers": {
                    "authorization": this.token,
                    "content-type": "multipart/form-data; boundary=----BDR",
                },
                "body": `------BDR\r\nContent-Disposition: form-data; name="payload_json"\r\n\r\n{"type":2,"application_id":"${MUDAE_USER_ID}","guild_id":"${guildId}","channel_id":"${channelId}","session_id":"${this.manager.sessionID}","data":{"version":"${command.version}","id":"${command.id}","name":"${rollType}","type":1},"nonce":"${++this.manager.nonce}"}\r\n------BDR--\r\n`
            });
        } catch (error) {
            console.error(error);
            throw Error("Couldn't send interaction request. Check console for more info.");
        }
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