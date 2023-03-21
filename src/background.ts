import { EventLog, ErrorLog, BotEvent, WarnLog, Logs, Stats, LogType, Unseen, LOG_BADGE_COLORS, LOG_TYPES } from "./lib/events";
import type { Message } from "./lib/messaging";
import { EVENTS, blankLogs, blankStats, blankUnseen } from "./lib/events";
import { MESSAGES } from "./lib/messaging";
import { dateToHMS } from "./lib/utils";

const getStats = async (): Promise<Stats> => {
    const result = await chrome.storage.session.get("stats");

    return result.stats || blankStats();
};

const getLogs = async (): Promise<Logs> => {
    const result = await chrome.storage.session.get("logs");

    return result.logs || blankLogs();
};

const updateStats = async (cb: (stats: Stats) => Stats) => {
    chrome.storage.session.set({ stats: cb(await getStats()) });
};

const updateLogs = async (cb: (logs: Logs) => Logs) => {
    chrome.storage.session.set({ logs: cb(await getLogs()) });
};

const updateBadge = (unseen: Unseen, logType?: LogType) => {
    let count = 0;

    for (const type in unseen) {
        count += unseen[type as keyof typeof unseen];
    }

    chrome.action.setBadgeText({ text: count ? String(count) : "" });

    if (logType) {
        if ((logType !== LOG_TYPES.ERROR && unseen.error > 0) ||
            (logType === LOG_TYPES.EVENT && unseen.warn > 0)) return;

        chrome.action.setBadgeBackgroundColor({ color: LOG_BADGE_COLORS[logType] });
    }
};

const getUnseen = async (): Promise<Unseen> => {
    const data = await chrome.storage.session.get("unseen");

    return data.unseen || blankUnseen();
};

const increaseUnseen = async (logType: LogType) => {
    const unseen = await getUnseen();
    unseen[logType]++;

    chrome.storage.session.set({ unseen }, () => updateBadge(unseen, logType));
};

const clearUnseen = async (logType: LogType) => {
    const unseen = await getUnseen();
    unseen[logType] = 0;
    chrome.storage.session.set({ unseen }, () => updateBadge(unseen));
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
            break;
        case MESSAGES.BOT.ERROR:
            updateLogs(logs => {
                const log: ErrorLog = { time: dateToHMS(new Date()), type: "error", content: message.data };
                logs.errors.push(log);
                return logs;
            });
            increaseUnseen(LOG_TYPES.ERROR);
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
                        const { character: claimCharacter, user: claimUser } = message.data.content;

                        stats.characters[claimUser] ??= [];
                        stats.characters[claimUser].push(claimCharacter);
                        break;
                    case EVENTS.STEAL:
                        const { character: stealCharacter, user: stealUser } = message.data.content;

                        stats.steals.push({ character: stealCharacter || null, user: stealUser || null });
                        break;
                    case EVENTS.KAKERA:
                        const { user: kakeraUser, amount: kakeraAmount, type: kakeraType } = message.data.content;

                        stats.kakera.perType[kakeraType] = Object.hasOwn(stats.kakera.perType, kakeraType) ? stats.kakera.perType[kakeraType] + 1 : 1;
                        stats.kakera.amount[kakeraUser] = Object.hasOwn(stats.kakera.amount, kakeraUser) ? stats.kakera.amount[kakeraUser] + kakeraAmount : kakeraAmount;
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
            break;
        case MESSAGES.APP.GET_EVERYTHING:
            (async () => {
                const stats = await getStats();
                const logs = await getLogs();
                const unseen = await getUnseen();

                sendResponse({ status: null, stats, logs, unseen });
            })();

            return true;
        case MESSAGES.APP.CLEAR_UNSEEN:
            clearUnseen(message.data);
            break;
        default:
            break;
    }
});

export { }