import type { EventLog, ErrorLog, WarnLog, Logs, LogType, Unseen } from "./lib/bot/log";
import type { BotEvent } from "./lib/bot/event";
import type { Stats } from "./lib/bot/status_stats";
import type { Message } from "./lib/messaging";
import type { Preferences } from "./lib/bot";
import { LOG_BADGE_COLORS, LOG_TYPES } from "./lib/bot/log";
import { blankLogs, blankUnseen } from "./lib/bot/log";
import { blankStats } from "./lib/bot/status_stats";
import { EVENTS } from "./lib/bot/event";
import { MESSAGES } from "./lib/messaging";
import { dateToHMS } from "./lib/utils";
import { MUDAE_SILVERIV_KAKERA_BONUS } from "./lib/consts";

const updateBadge = (unseen: Unseen) => {
    const count = unseen.error + unseen.warn + unseen.event;

    const hasAnyEvent = count > 0;

    chrome.action.setBadgeText({ text: hasAnyEvent ? String(count) : "" });

    if (hasAnyEvent) {
        const color = unseen.error > 0 ? LOG_BADGE_COLORS.error : unseen.warn > 0 ? LOG_BADGE_COLORS.warn : LOG_BADGE_COLORS.event;

        chrome.action.setBadgeBackgroundColor({ color });
    }
};

const getStats = async (): Promise<Stats> => {
    const result = await chrome.storage.session.get("stats");

    return result.stats || blankStats();
};

const getLogs = async (): Promise<Logs> => {
    const result = await chrome.storage.session.get("logs");

    return result.logs || blankLogs();
};

const getUnseen = async (): Promise<Unseen> => {
    const data = await chrome.storage.session.get("unseen");

    return data.unseen || blankUnseen();
};

const getPreferences = async (): Promise<Preferences | null> => {
    const data = await chrome.storage.local.get("preferences");

    return data.preferences || null;
};

const updateStats = async (cb: (stats: Stats) => Stats) => {
    chrome.storage.session.set({ stats: cb(await getStats()) });
};

const updateLogs = async (cb: (logs: Logs) => Logs) => {
    chrome.storage.session.set({ logs: cb(await getLogs()) });
};

const updatePreferences = async (cb: (preferences: Preferences) => Preferences) => {
    const preferences = await getPreferences();

    if (preferences){
        chrome.storage.local.set({preferences: cb(preferences)});
    }
};

const increaseUnseen = async (logType: LogType) => {
    const unseen = await getUnseen();
    unseen[logType]++;

    chrome.storage.session.set({ unseen }, () => updateBadge(unseen));
};

const clearUnseen = async (logType: LogType) => {
    const unseen = await getUnseen();
    unseen[logType] = 0;
    chrome.storage.session.set({ unseen }, () => updateBadge(unseen));
};

const storeUsernameForToken = async (username: string, token: string) => {
    const result = await chrome.storage.local.get("usernames");

    const usernames: { [token: string]: string } = result.usernames || {};

    usernames[token] = username;

    chrome.storage.local.set({ usernames });
};

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    if (!Object.hasOwn(message, "id")) return;

    switch (message.id) {
        case MESSAGES.BOT.WARN:
            updateLogs(logs => {
                const log: WarnLog = { time: dateToHMS(new Date()), type: "warn", content: message.data };
                logs.warns.push(log);
                return logs;
            });
            increaseUnseen(LOG_TYPES.WARN);
            sendResponse();
            break;
        case MESSAGES.BOT.ERROR:
            updateLogs(logs => {
                const log: ErrorLog = { time: dateToHMS(new Date()), type: "error", content: message.data };
                logs.errors.push(log);
                return logs;
            });
            increaseUnseen(LOG_TYPES.ERROR);
            sendResponse();
            break;
        case MESSAGES.BOT.EVENT:
            updateLogs(logs => {
                const log: EventLog = { time: dateToHMS(new Date()), type: "event", content: { eventType: message.data.eventType as BotEvent, eventData: message.data.content } };
                logs.events.push(log);
                return logs;
            });

            updateStats(stats => {
                switch (message.data.eventType as BotEvent) {
                    case EVENTS.CLAIM:
                        const claimUsername: string = message.data.content.user;
                        const claimCharacter: string = message.data.content.character;
                        const claimKakera: number = message.data.content.kakera;

                        stats.characters[claimUsername] ??= [];
                        stats.characters[claimUsername].push(claimCharacter);

                        if (claimKakera > 0) {
                            stats.kakera[claimUsername] = Object.hasOwn(stats.kakera, claimUsername) ? stats.kakera[claimUsername] + claimKakera : claimKakera;
                        }

                        updatePreferences(preferences => {
                            preferences.claim.characterList.delete(claimCharacter);

                            return preferences;
                        });
                        break;
                    case EVENTS.STEAL:
                        const { character: stealCharacter, user: stealUser } = message.data.content;

                        stats.steals.push({ character: stealCharacter || null, user: stealUser || null });
                        break;
                    case EVENTS.KAKERA:
                        const kakeraUser: string = message.data.content.user;
                        const kakeraAmount: number = Number(message.data.content.amount);

                        stats.kakera[kakeraUser] = Object.hasOwn(stats.kakera, kakeraUser) ? stats.kakera[kakeraUser] + kakeraAmount : kakeraAmount;
                        break;
                    case EVENTS.KAKERA_SILVERIV:
                        const silverIVUsernames: string[] = message.data.content;

                        silverIVUsernames.forEach(username => {
                            stats.kakera[username] = (Object.hasOwn(stats.kakera, username) ? stats.kakera[username] + MUDAE_SILVERIV_KAKERA_BONUS : MUDAE_SILVERIV_KAKERA_BONUS);
                        });

                        break;
                    case EVENTS.SOULMATE:
                        const { character: soulmateCharacter, user: soulmateUser } = message.data.content;

                        stats.soulmates[soulmateUser] ??= [];
                        stats.soulmates[soulmateUser].push(soulmateCharacter);
                        break;
                    default:
                        break;
                }

                return stats;
            });

            increaseUnseen(LOG_TYPES.EVENT);
            sendResponse();
            break;
        case MESSAGES.BOT.STORE_USERNAME:
            const { username, token } = message.data as { username: string, token: string };

            storeUsernameForToken(username, token);
            break;
        case MESSAGES.APP.GET_EVERYTHING:
            // chrome.notifications.create("", {type: "basic", title: "Test", message: "Msg", iconUrl: "../../128.png"});

            (async () => {
                const stats = await getStats();
                const logs = await getLogs();
                const unseen = await getUnseen();

                sendResponse({ stats, logs, unseen });
            })();

            return true;
        case MESSAGES.APP.CLEAR_UNSEEN:
            clearUnseen(message.data);
            sendResponse();
            break;
        default:
            break;
    }
});

export { }