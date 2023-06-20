import type { BotEvent } from "./bot/event";
import type { DiscordMessage } from "./discord";
import { EMOJIS, INTERVAL_SEND_MESSAGE, MUDAE_CLAIM_RESET_DEFAULT, MUDAE_DEFAULT_RESET_MINUTE, MUDAE_KAKERALOOTS_MAX, MUDAE_USER_ID, PREFERENCES_VERSION } from "./consts";
import { SVGS } from "./svgs";
import { KAKERAS, SLASH_COMMANDS, SlashCommand } from "./mudae";
import { minifyToken, sleep } from "./utils";
import _ from "lodash";

export type ChatNodeTags = (string | [string, string])[];

export const ROLL_TYPES = ["wx", "wa", "wg", "hx", "ha", "hg"] as const;

export type PrefUseUsers = "logged" | "tokenlist";
export type PrefRollType = typeof ROLL_TYPES[number];
export type PrefNotificationType = "sound" | "popup" | "both";
export type PrefNotification = keyof typeof NOTIFICATIONS;
export type PrefLanguage = "en" | "fr" | "es" | "pt_br";
export type PrefDailyKakera = "off" | "available" | "reset_power";

export interface Preferences {
    preferencesVersion: number
    useUsers: PrefUseUsers
    tokenList: Set<string>
    dk: PrefDailyKakera
    getDaily: boolean
    debug: boolean
    guild: {
        language: PrefLanguage;
        claimReset: number
        resetMinute: number
    }
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
        wishedByMe: boolean
        wishedByOthers: boolean
        fromListCharacters: boolean
        fromListSeries: boolean
        onlyLastReset: boolean
        targetUsersList: Set<string>
        characterList: Set<string>
        seriesList: Set<string>
    }
    kakera: {
        delay: number
        delayRandom: boolean
        perToken: Map<string, Set<keyof typeof KAKERAS>>
    }
    kl: {
        enabled: boolean
        amount: number
        arlp: boolean
    }
};

export interface BotManager {
    state: BotState
    isThinking: boolean
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
    lastPeriodHash: string
    didWarnThisPeriod: boolean
    chatObserver: MutationObserver
    lastErrorMessage?: string

    hasNeededInfo(): boolean
    isLastReset(shift?: number, now?: Date): boolean
    mudaeTimeToMs(time: string): number | null
    getMarriageableUser(priority?: { nicknames?: string[], userId?: string }): BotUser | null
    setup(): Promise<void>
    toggle(): void
    think(): Promise<void>
    error(message: string): void
    processChatNode($msg: HTMLElement): Promise<ChatNodeTags | null>
    handleNewChatAppend(nodes: NodeList): void
    getUserWithCriteria(cb: (user: BotUser) => boolean): BotUser | null

    log: {
        console(...args: unknown[]): void
        warn(message: string): void
        error(message: string, isCritical: boolean): void
        event(eventType: BotEvent, content: any): void
    }

    message: {
        _DiscordMessageCache: Map<string, DiscordMessage | null>
        _MessageAuthorCache: Map<HTMLElement, string | null>
        _fetch: (messageId: string) => Promise<DiscordMessage | null>
        get: (message: string | HTMLElement) => Promise<DiscordMessage | null>
        getId: ($message: HTMLElement) => string | undefined
        getAuthorId: ($message: HTMLElement) => Promise<string | null>
        isFromMudae: ($message: HTMLElement) => Promise<boolean>
        getInteractionInfo: ($message: HTMLElement) => Promise<InteractionInfo | null>
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
    ROLLS_LEFT_US: "rolls_left_us",
    POWER: "power",
    CAN_RT: "can_rt",
    CAN_MARRY: "can_marry",
    CONSUMPTION: "kakera_consumption",
    CAN_DAILY: "can_daily",
    CAN_DK: "can_dk"
} as const;

export type UserInfo = typeof USER_INFO[keyof typeof USER_INFO];

const NEEDED_USER_INFO: UserInfo[] = [
    USER_INFO.ROLLS_LEFT,
    USER_INFO.ROLLS_MAX,
    USER_INFO.POWER,
    USER_INFO.CAN_RT,
    USER_INFO.CAN_MARRY,
    USER_INFO.CONSUMPTION
];

export interface InteractionInfo {
    userId: string
    command: string
};

export class BotUser {
    manager: BotManager
    info: Map<UserInfo, unknown>
    token: string
    id?: string
    username?: string
    avatar?: string
    nick?: string
    canKL: boolean
    fullOfPins: boolean

    constructor(botManager: BotManager, token: string, id?: string, username?: string, avatar?: string) {
        this.manager = botManager;
        this.token = token;
        this.info = new Map();
        this.canKL = true;
        this.fullOfPins = false;

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
        const guildId = this.manager.info.get(DISCORD_INFO.GUILD_ID) || window.location.pathname.split("/")[2];

        let nick: string = "";
        let userData: any;

        while (!nick) {
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

            /// Rate limited
            if (Object.hasOwn(userData, "retry_after")) {
                const retryTime: number = userData.retry_after * 1000;

                await sleep(retryTime);

                continue;
            }

            if (!Object.hasOwn(userData, "guild_member")) {
                throw Error(`Token [${minifyToken(this.token)}] must be a member of this guild`);
            }

            /// Using username in case of null nick
            nick = userData.guild_member.nick || userData.user.username;
        }

        this.nick = nick;
    }

    missingInfo(): UserInfo[] {
        const missingUserInfo: UserInfo[] = [];

        NEEDED_USER_INFO.forEach(uinfo => {
            if (!this.info.has(uinfo)) missingUserInfo.push(uinfo);
        });

        return missingUserInfo;
    }

    async pressMessageButton($message: HTMLElement): Promise<void> {
        const messageId = this.manager.message.getId($message);
        const guildId = this.manager.info.get(DISCORD_INFO.GUILD_ID);
        const channelId = this.manager.info.get(DISCORD_INFO.CHANNEL_ID);

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
            throw Error("Check console for more info.");
        }
    }

    async reactToMessage($message: HTMLElement): Promise<void> {
        const channelId = this.manager.info.get(DISCORD_INFO.CHANNEL_ID);
        const messageId = this.manager.message.getId($message);

        if (!messageId) throw Error("Unknown message ID.");
        if (!channelId) throw Error("Unknown channel ID.");

        const emoji = _.sample(EMOJIS);

        try {
            fetch(`https://discord.com/api/v9/channels/${channelId}/messages/${messageId}/reactions/${emoji}/%40me`, {
                "method": "PUT",
                "headers": {
                    "authorization": this.token,
                }
            });
        } catch (error) {
            console.error("Error while reacting to a Discord message", $message, error);
            throw Error("Check console for more info.");
        }
    }

    private async sendSlashCommand(command: SlashCommand, appendOptions?: string): Promise<void> {
        const slashCommandInfo = SLASH_COMMANDS[command];
        const guildId = this.manager.info.get(DISCORD_INFO.GUILD_ID);
        const channelId = this.manager.info.get(DISCORD_INFO.CHANNEL_ID);

        if (!guildId) {
            throw Error("Unknown guild ID.");
        }
        if (!channelId) {
            throw Error("Unknown channel ID.");
        }

        try {
            await fetch("https://discord.com/api/v9/interactions", {
                "method": "POST",
                "headers": {
                    "authorization": this.token,
                    "content-type": "multipart/form-data; boundary=----BDR",
                },
                "body": `------BDR\r\nContent-Disposition: form-data; name="payload_json"\r\n\r\n{"type":2,"application_id":"${MUDAE_USER_ID}","guild_id":"${guildId}","channel_id":"${channelId}","session_id":"${this.manager.sessionID}","data":{"version":"${slashCommandInfo.version}","id":"${slashCommandInfo.id}","name":"${command}","type":1${appendOptions ? `,"options":[${appendOptions}]` : ""}},"nonce":"${++this.manager.nonce}"}\r\n------BDR--\r\n`
            });
        } catch (error) {
            console.error(error);
            throw Error("Couldn't send interaction request. Check console for more info.");
        }
    }

    send = {
        tu: async () => {
            await this.sendSlashCommand("tu");
        },
        roll: async () => {
            if (!this.manager.preferences) {
                throw Error("Unknown preferences.")
            }

            await this.sendSlashCommand(this.manager.preferences.roll.type);
        },
        daily: async () => {
            await this.sendSlashCommand("daily");
        },
        kakeraLoots: async (amount: number = 1) => {
            amount = _.clamp(amount, 1, MUDAE_KAKERALOOTS_MAX);

            await this.sendSlashCommand("kakeraloots", `{"type":1,"name":"get","options":[{"type":3,"name":"input","value":"${amount}"}]}`);
        },
        autoReleasePin: async () => {
            await this.sendSlashCommand("mudapins", `{"type":1,"name":"autoreleasepin","options":[]}`);
        },
        message: async (message: string) => {
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
    }
};

export const defaultPreferences = (): Preferences => ({
    preferencesVersion: PREFERENCES_VERSION,
    useUsers: "logged",
    tokenList: new Set(),
    dk: "off",
    getDaily: false,
    debug: false,
    guild: {
        language: "en",
        claimReset: MUDAE_CLAIM_RESET_DEFAULT,
        resetMinute: MUDAE_DEFAULT_RESET_MINUTE

    },
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
        delayRandom: false,
        wishedByMe: true,
        wishedByOthers: false,
        fromListCharacters: false,
        fromListSeries: false,
        onlyLastReset: false,
        targetUsersList: new Set(),
        characterList: new Set(),
        seriesList: new Set()
    },
    kakera: {
        delay: .1,
        delayRandom: false,
        perToken: new Map([["all", new Set()]])
    },
    kl: {
        enabled: false,
        amount: 1,
        arlp: true
    }
});