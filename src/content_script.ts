import type { BotManager, BotState, Preferences, ChatNodeTags } from "./lib/bot";
import type { Message } from "./lib/messaging";
import type { KAKERA } from "./lib/mudae";
import type { UserStatus } from "./lib/bot/status_stats";
import type { DiscordMessage } from "./lib/discord";
import { DISCORD_INFO } from "./lib/bot";
import { BotUser, USER_INFO, ROLL_TYPES } from "./lib/bot";
import { INTERVAL_THINK, INTERVAL_ROLL, MUDAE_USER_ID, INTERVAL_DONT_ROLL_AFTER_ACTIVITY, INTERVAL_GATHER_INFO, MAX_CLAIM_DELAY_IN_SECONDS } from "./lib/consts";
import { MESSAGES, ChromeMessageQueue } from "./lib/messaging";
import { KAKERAS } from "./lib/mudae";
import { getPeriodHash, jsonMapSetReplacer, jsonMapSetReviver, minifyToken, randomFloat, randomSessionID } from "./lib/utils";
import { EVENTS } from "./lib/bot/event";
import _ from "lodash";
import { LANG } from "./lib/localization";

const chromeMessageQueue = new ChromeMessageQueue();

const bot: BotManager = {
    state: "waiting_injection",
    isThinking: false,
    preferences: null,
    $chat: null,
    info: new Map(),
    users: new Set(),
    cdSendMessage: 0,
    cdGatherInfo: 0,
    cdRoll: 0,
    lastSeenMessageTime: 0,
    lastPeriodHash: "",
    didWarnThisPeriod: false,
    nonce: Math.floor(Math.random() * 1000000),
    sessionID: randomSessionID(),
    chatObserver: new MutationObserver(ms => ms.forEach(m => { if (m.addedNodes.length) { bot.handleNewChatAppend(m.addedNodes) } })),

    log: {
        console(...args) {
            console.log("%c[AutoMudae]", "color: pink", ...args);
        },
        warn(message) {
            chromeMessageQueue.sendMessage({ id: MESSAGES.BOT.WARN, data: message });
        },
        error(message, isCritical) {
            chromeMessageQueue.sendMessage({ id: MESSAGES.BOT.ERROR, data: { message, isCritical } });
        },
        event(eventType, content) {
            chromeMessageQueue.sendMessage({ id: MESSAGES.BOT.EVENT, data: { eventType, content } });
        }
    },

    message: {
        _DiscordMessageCache: new Map(),
        _MessageAuthorCache: new Map(),
        _fetch(messageId) {
            return new Promise((resolve, reject) => {
                if (!bot.info.has(DISCORD_INFO.CHANNEL_ID)) {
                    reject("Unknown channel ID.");
                    return;
                }

                const channelId = bot.info.get(DISCORD_INFO.CHANNEL_ID) as string;
                const [firstUser] = bot.users;

                fetch(`https://discord.com/api/v9/channels/${channelId}/messages?limit=1&around=${messageId}`, {
                    "headers": {
                        "authorization": firstUser.token
                    }
                })
                    .then(r => r.json())
                    .then(r => {
                        if (!Array.isArray(r)) {
                            reject("Invalid response from Discord API.");
                            return;
                        }

                        if (r.length < 1) {
                            resolve(null);
                            return;
                        }

                        resolve(r[0] as DiscordMessage);
                    })
                    .catch(reject);
            });
        },
        async get(message) {
            const messageId = typeof message === "string" ? message : this.getId(message);

            if (!messageId) return null;

            if (this._DiscordMessageCache.has(messageId)) {
                return this._DiscordMessageCache.get(messageId) as DiscordMessage;
            }

            const msg = await this._fetch(messageId);
            this._DiscordMessageCache.set(messageId, msg);

            return msg;
        },
        getId($message) {
            const messageId = _.last($message.id.split("-"));

            if (!messageId) console.error("Couldn't find message ID", $message);

            return messageId;
        },
        async getAuthorId($message) {
            if (this._MessageAuthorCache.has($message)) {
                return this._MessageAuthorCache.get($message) as string | null;
            }

            let $targetMessage = $message;
            let $avatar: HTMLImageElement | null | undefined;

            while (!$avatar) {
                $avatar = $targetMessage.querySelector("img[class^='avatar']") as HTMLImageElement | null;
                if ($avatar) break;

                /// This message is probably in a sequence of messages from the same person
                /// So it seeks for the previous messages with an avatar
                if ($targetMessage.previousElementSibling) {
                    $targetMessage = $targetMessage.previousElementSibling as HTMLElement;
                }

                /// If it's not an `li`, it must be the red divisor of new messages, which would be an `div`
                /// It will keep seeking for previous elements until it reaches "old" messages, before the divisor
                while ($targetMessage && $targetMessage.tagName !== "LI") {
                    if ($targetMessage.previousElementSibling) {
                        $targetMessage = $targetMessage.previousElementSibling as HTMLElement;
                    }
                }

                /// No more messages to search for the avatar
                if (!$avatar && !$targetMessage) {
                    break;
                }
            }

            if ($avatar) {
                const match = /users\/(\d+)\/avatars/.exec($avatar.src) || /avatars\/(\d+)\//.exec($avatar.src);

                if (match) {
                    const authorId = match[1];

                    this._MessageAuthorCache.set($message, authorId);

                    return authorId;
                }
            }

            /// Couldn't get avatar from messages, which would be really strange
            /// Or it's from an user that has no custom avatar
            /// Then it will try to fetch this message from Discord API to see it's author ID

            const message = await this.get($message);

            if (message) {
                this._MessageAuthorCache.set($message, message.author.id);

                return message.author.id;
            }

            return null;
        },
        async isFromMudae($message) {
            const messageAuthorId = await this.getAuthorId($message);

            return messageAuthorId === MUDAE_USER_ID;
        },
        async getInteractionInfo($message) {
            const $avatar = $message.querySelector("img[class^='executedCommandAvatar']") as HTMLImageElement | null;
            const $commandName = $message.querySelector("[class^='commandName']") as HTMLDivElement | null;

            if (!$avatar || !$commandName) {
                return null;
            }

            const avatarUserIdMatch = /users\/(\d+)\/avatars/.exec($avatar.src) || /avatars\/(\d+)\//.exec($avatar.src);

            if (!avatarUserIdMatch || !$commandName.innerText) {
                return null;
            };

            return { userId: avatarUserIdMatch[1], command: $commandName.innerText.slice(1) };
        },
    },

    timers: {
        _t: new Map(),
        set(identifier, callback, ms, isInterval = false) {
            if (this._t.has(identifier)) clearTimeout(identifier);
            const timer = {
                ref: isInterval ? setInterval(callback, ms) : setTimeout(callback, ms),
                isInterval
            };
            this._t.set(identifier, timer);
        },
        clear() {
            for (const [, t] of this._t) {
                t.isInterval ? clearInterval(t.ref) : clearTimeout(t.ref);
            }
            this._t.clear();
        }
    },

    error(message) {
        this.toggle();
        this.state = "error";
        this.lastErrorMessage = message;
        this.log.error(message, true);
    },

    hasNeededInfo() {
        for (const botUser of this.users) {
            if (botUser.missingInfo().length > 0) return false;
        }
        return true;
    },

    isLastReset(shift = 0, now = new Date()) {
        const h = now.getHours() - shift;
        const m = now.getMinutes();
        let mod = h % 3;

        if (mod < 0) {
            mod += 3;
        }

        return (mod === 2 && m >= 36) || (mod === 0 && m < 36);
    },

    mudaeTimeToMs(time: string) {
        if (!time.includes("h")) return Number(time) * 60 * 1000;

        const match = /(\d+h)?\s?(\d+)?/.exec(time);

        if (!match) return null;

        const h = match[1], m = match[2];

        let totalMs = 0;

        if (h) totalMs += Number(h.replace(/\D/g, '')) * 60 * 60 * 1000;
        if (m) totalMs += Number(m) * 60 * 1000;

        return totalMs;
    },

    getMarriageableUser(priority?: { nicknames?: string[], userId?: string }) {
        if (!priority) {
            return this.getUserWithCriteria(user => (user.info.get(USER_INFO.CAN_MARRY) as boolean));
        }

        let marriageableUser;

        for (const botUser of this.users) {
            if (!botUser.nick) {
                this.error(`Couldn't get nickname for ${botUser.username ? ("user " + botUser.username) : ("token " + minifyToken(botUser.token))}`);
                return null;
            }

            if (botUser.info.get(USER_INFO.CAN_MARRY)) {
                marriageableUser = botUser;

                if (priority.userId) {
                    if (priority.userId === botUser.id) break;
                } else if (priority.nicknames && priority.nicknames.includes(botUser.nick)) {
                    break;
                }
            }
        }

        return marriageableUser || null;
    },

    getUserWithCriteria(cb) {
        for (const botUser of this.users) {
            if (cb(botUser)) return botUser;
        }
        return null;
    },

    async setup() {
        bot.state = "setup";

        if (!bot.preferences) throw Error("Malformed preferences.");

        const windowPathname = window.location?.pathname;

        if (!windowPathname) {
            throw Error("Couldn't retrieve current window URL.");
        }

        const [, pathDiscriminator, guildId, channelId] = windowPathname.split("/");

        if (pathDiscriminator !== "channels") {
            throw Error("You must be in the desired channel.");
        }

        if (!guildId || !channelId) {
            throw Error("Couldn't retrieve active guild or channel ID.");
        }

        bot.info.set(DISCORD_INFO.CHANNEL_ID, channelId);
        bot.info.set(DISCORD_INFO.GUILD_ID, guildId);

        this.$chat = document.querySelector("ol[class^='scrollerInner']");

        if (this.$chat == null) {
            throw Error("Couldn't find the channel chat.");
        }

        if (bot.preferences.useUsers === "tokenlist") {
            for (const token of bot.preferences.tokenList) {
                const user = new BotUser(bot, token);

                await user.init();
                storeUsernameForToken(user.username as string, user.token);
                bot.users.add(user);
            }

            return;
        }

        const storeUsers = JSON.parse(localStorage.MultiAccountStore)?._state.users;
        const storeTokens = JSON.parse(localStorage.tokens);

        if (!storeUsers || !storeTokens) {
            throw Error("Couldn't retrieve information about logged users.");
        }

        for (const storeUser of storeUsers) {
            const { id, username, avatar } = storeUser;

            const token = storeTokens[id];

            if (!token) {
                throw Error(`Couldn't retrieve user token for [${username}].`);
            }

            const user = new BotUser(bot, token, id, username, avatar);

            await user.init();
            storeUsernameForToken(user.username as string, user.token);
            bot.users.add(user);
        }

    },

    toggle() {
        if (this.state !== "idle" && this.state !== "running") return;
        if (this.$chat == null) return;

        if (this.state === "idle") {
            this.timers.set("think", () => {
                if (bot.isThinking) return;
                bot.isThinking = true;

                this.think();

                bot.isThinking = false;
            }, INTERVAL_THINK, true);

            this.chatObserver.observe(this.$chat, { childList: true });

            this.state = "running";
            return;
        }

        this.chatObserver.disconnect();
        this.timers.clear();
        this.users.forEach(user => user.info.clear());
        this.state = "idle";
    },

    async think() {
        //# Throw
        if (!bot.preferences) return;

        const nowDate = new Date();

        /// Handle hourly period reset
        const currentPeriodHash = getPeriodHash(nowDate, bot.preferences.guild.resetMinute);

        if (currentPeriodHash !== bot.lastPeriodHash) {
            bot.log.console("Different period. Resetting users info to send /tu.");

            bot.lastPeriodHash = currentPeriodHash;
            bot.didWarnThisPeriod = false;

            /// Forcing users to gather their info with /tu again
            bot.users.forEach(user => {
                user.canKL = true;
                user.info.delete(USER_INFO.ROLLS_LEFT)
            });

            return;
        }

        const now = performance.now();

        /// Send /tu to gather info if needed
        if (!bot.hasNeededInfo()) {
            if (now - bot.cdGatherInfo < INTERVAL_GATHER_INFO) return;

            for (const botUser of bot.users) {
                if (botUser.missingInfo().length > 0) {
                    try {
                        await botUser.send.tu();
                    } catch (err) {
                        bot.log.error(`User ${botUser.username} couldn't send TU: ${(err as Error)?.message}`, false);
                    }
                    break;
                }
            }

            bot.cdGatherInfo = now;
            return;
        }

        if (bot.preferences.getDaily) {
            const userWithDaily = bot.getUserWithCriteria(user => user.info.get(USER_INFO.CAN_DAILY) as boolean);

            if (userWithDaily) {
                try {
                    await userWithDaily.send.daily();
                } catch (err) {
                    bot.log.error(`User ${userWithDaily.username || "?"} couldn't send daily: ${(err as Error)?.message}`, false);
                }

                return;
            }
        }

        if (bot.preferences.kl.enabled) {
            const userThatCanKL = bot.getUserWithCriteria(user => user.canKL);

            if (userThatCanKL) {
                if (!userThatCanKL.fullOfPins) {
                    await userThatCanKL.send.kakeraLoots(bot.preferences.kl.amount);
                    return;
                }

                if (bot.preferences.kl.arlp) {
                    await userThatCanKL.send.autoReleasePin();
                    return;
                }
            }
        }

        if (bot.preferences.roll.enabled) {
            const canRollNow = now - bot.lastSeenMessageTime > INTERVAL_DONT_ROLL_AFTER_ACTIVITY && now - bot.cdRoll > INTERVAL_ROLL;

            if (!canRollNow) return;

            const userWithRolls = bot.getUserWithCriteria(user => {
                const rollsLeft = user.info.get(USER_INFO.ROLLS_LEFT) as number;
                const rollsLeftUs = user.info.get(USER_INFO.ROLLS_LEFT_US) as number | undefined;
                const totalRollsLeft = rollsLeft + (rollsLeftUs || 0);

                return totalRollsLeft > 0;
            });

            if (userWithRolls) {
                bot.cdRoll = now;

                try {
                    await userWithRolls.send.roll();
                } catch (err) {
                    bot.log.error(`User ${userWithRolls.username || "?"} couldn't roll: ${(err as Error)?.message}`, false);
                }

                return;
            }

            if (!bot.didWarnThisPeriod && bot.isLastReset(0, nowDate) && bot.getMarriageableUser()) {
                bot.didWarnThisPeriod = true;

                //# if isRollEnabled auto-use $us or $rolls

                bot.log.warn("You have no more rolls, can still marry and it's the last reset.");
            }
        }
    },

    async processChatNode($msg) {
        const tags: ChatNodeTags = [];

        if (!bot.preferences) {
            tags.push(["aborted", "no preferences found"]);
            return tags;
        }

        if ($msg.tagName !== "LI") return null;

        tags.push("message");

        bot.lastSeenMessageTime = performance.now();

        if (!await bot.message.isFromMudae($msg)) {
            tags.push("not-from-mudae");
            return tags;
        }

        const interactionInfo = await bot.message.getInteractionInfo($msg);
        const messageContent: string | undefined = ($msg.querySelector("div[id^='message-content']") as HTMLDivElement | null)?.innerText;

        let botUser: BotUser | null = null;

        if (interactionInfo) {
            tags.push("slash-command");

            botUser = bot.getUserWithCriteria(user => user.id === interactionInfo.userId);

            if (botUser) {
                tags.push(["prompt-user", botUser.username || ""]);

                if (messageContent) {
                    if (interactionInfo.command === "tu") {
                        tags.push(["mudae-command", "tu"]);

                        const localization = LANG[bot.preferences.guild.language];

                        const matchRolls = localization.regex.tu_rolls.exec(messageContent);
                        const matchRollsUs = localization.regex.tu_rollsUs.exec(messageContent);
                        const matchPower = localization.regex.tu_power.exec(messageContent);
                        const matchKakeraConsumption = localization.regex.tu_kakeraConsumption.exec(messageContent);
                        const matchDaily = messageContent.includes(localization.string.tu_daily);
                        const matchDK = messageContent.includes(localization.string.tu_dk);

                        botUser.info.set(USER_INFO.CAN_DAILY, matchDaily);
                        botUser.info.set(USER_INFO.CAN_DK, matchDK);

                        if (matchRolls) {
                            const rolls = Number(matchRolls[1]);

                            botUser.info.set(USER_INFO.ROLLS_LEFT, rolls);

                            const hasRollsMax = botUser.info.has(USER_INFO.ROLLS_MAX);

                            if (!hasRollsMax || (botUser.info.get(USER_INFO.ROLLS_MAX) as number) < rolls) {
                                botUser.info.set(USER_INFO.ROLLS_MAX, rolls);
                            }
                        }

                        if (matchRollsUs) {
                            const rollsUs = Number(matchRollsUs[1]);

                            botUser.info.set(USER_INFO.ROLLS_LEFT_US, rollsUs);
                        }

                        if (matchPower) {
                            const power = Number(matchPower[1]);

                            botUser.info.set(USER_INFO.POWER, power);
                        }

                        if (matchKakeraConsumption) {
                            const consumption = Number(matchKakeraConsumption[1]);

                            botUser.info.set(USER_INFO.CONSUMPTION, consumption);
                        }

                        if (/\$rt/.test(messageContent)) {
                            const cooldownRTMatch = /: (.+) min. \(\$rtu\)/.exec(messageContent);

                            botUser.info.set(USER_INFO.CAN_RT, !cooldownRTMatch);

                            //# recheck for RT after ms
                            // if (cooldownRTMatch) {
                            // const ms = bot.mudaeTimeToMs(cooldownRTMatch[1]);
                            // }
                        } else {
                            botUser.info.set(USER_INFO.CAN_RT, false);
                        }

                        if (localization.regex.tu_marry.test(messageContent)) {
                            const cantMarry = localization.regex.tu_cantMarry.test(messageContent);

                            botUser.info.set(USER_INFO.CAN_MARRY, !cantMarry);
                        }

                        const missingUserInfo = botUser.missingInfo();

                        if (missingUserInfo.length > 0) {
                            tags.push(["aborted", "missing info"]);

                            bot.error(`Couldn't retrieve info for user ${botUser.username}: ${missingUserInfo}`);
                            return tags;
                        }

                        syncUserInfo(botUser);
                        return tags;
                    } else if (interactionInfo.command === "daily") {
                        tags.push(["mudae-command", "daily"]);

                        if (messageContent === "✅") {
                            botUser.info.set(USER_INFO.CAN_DAILY, false);
                            //# bot.log.event(EVENTS.DAILY)
                            return tags;
                        }

                        tags.push("no-more-daily");
                        return tags;
                    } else if (interactionInfo.command === "kakeraloots get") {
                        tags.push(["mudae-command", "kl"]);

                        const localization = LANG[bot.preferences.guild.language];

                        if (messageContent.startsWith(localization.string.kl_notEnoughKakera)) {
                            botUser.canKL = false;
                        } else if (messageContent.startsWith("Error:")) { /// Full of pins
                            //# Check if is "Error:" for every lang
                            botUser.fullOfPins = true;
                        }

                        return tags;
                    }
                }
            }
        }

        if (!bot.hasNeededInfo()) {
            tags.push(["aborted", "missing info"]);
            return tags;
        }

        /// Handle character messages
        const $imageWrapper = $msg.querySelector("div[class^='embedDescription'] + div[class^='imageContent'] div[class^='imageWrapper']") as HTMLDivElement | null;
        const isSlashRolled = interactionInfo ? ROLL_TYPES.includes(interactionInfo.command as any) : false;

        if (isSlashRolled || $imageWrapper) {
            tags.push(["character-roll-im", isSlashRolled ? "slash" : "typed"]);

            const characterName = ($msg.querySelector("span[class^='embedAuthorName']") as HTMLElement | null)?.innerText;

            if (!characterName) {
                /// Handle "no more rolls" messages
                if (messageContent) {
                    const noMoreRollsMatch = LANG[bot.preferences.guild.language].regex.noMoreRolls.exec(messageContent);

                    if (noMoreRollsMatch) {
                        tags.push(["no-more-rolls", botUser ? "me" : "other"]);

                        if (botUser) {
                            setTimeout(() => {
                                const user = botUser;

                                user?.send.tu()
                                    .catch(err => bot.log.error(`User ${user.username} couldn't send /tu: ${err.message}`, false))
                            }, 250);
                        }

                        return tags;
                    }
                }

                tags.push(["aborted", "no character name"]);

                bot.log.error("Couldn't get character name from message <NotImplementedReference>", false); //# Add reference to message
                return tags;
            }

            const $footer = $msg.querySelector("span[class^='embedFooterText']") as HTMLSpanElement | null;
            const isOwned = !!($footer && $footer.innerText.includes(LANG[bot.preferences.guild.language].string.ownedCharacter));

            tags.push(["character-owned", isOwned ? "yes" : "no"]);

            /// Decreases rolls count && handle new soulmates
            if (botUser) {
                const rollsUs = botUser.info.get(USER_INFO.ROLLS_LEFT_US) as number | undefined;

                if (rollsUs != null && rollsUs > 0) {
                    botUser.info.set(USER_INFO.ROLLS_LEFT_US, Math.max(rollsUs - 1, 0));
                    tags.push(["decreased-rolls", "us"]);
                } else {
                    const rollsLeft = botUser.info.get(USER_INFO.ROLLS_LEFT) as number;

                    botUser.info.set(USER_INFO.ROLLS_LEFT, Math.max(rollsLeft - 1, 0));
                    tags.push(["decreased-rolls", "default"]);
                }

                syncUserInfo(botUser);

                const $embedDescription = $msg.querySelector("div[class^='embedDescription']") as HTMLElement | null;

                if ($embedDescription && $embedDescription.innerText.includes(LANG[bot.preferences.guild.language].string.newSoulmate)) {
                    tags.push("new-soulmate");
                    bot.log.event(EVENTS.SOULMATE, { character: characterName, user: botUser.username });
                }
            }

            /// Check if should try to claim
            if (!isOwned) {
                const claimWishedByMe = bot.preferences.claim.wishedByMe;
                const claimWishedByOthers = bot.preferences.claim.wishedByOthers && bot.preferences.claim.targetUsersList.size > 0;
                const claimFromListCharacters = bot.preferences.claim.fromListCharacters && bot.preferences.claim.characterList.size > 0;
                const claimFromListSeries = bot.preferences.claim.fromListSeries && bot.preferences.claim.seriesList.size > 0;

                /// Don't want to claim
                if (!claimWishedByMe && !claimWishedByOthers && !claimFromListCharacters && !claimFromListSeries) return tags;

                let isThisInteresting = false;

                const mentionedNicknames: string[] = [...$msg.querySelectorAll("span.mention")].map($mention => ($mention as HTMLElement).innerText.slice(1));

                if (claimWishedByMe || claimWishedByOthers) {
                    for (const mentionedNick of mentionedNicknames) {
                        //# Check whether this mentioned botUser can claim. If so, skip the marriageable user part

                        if (claimWishedByMe) {
                            const botUserThatWished = bot.getUserWithCriteria(user => user.nick === mentionedNick);

                            if (botUserThatWished) {
                                tags.push(["interesting", `wished by ${botUserThatWished.username || "me"}`]);
                                isThisInteresting = true;
                                break;
                            }
                        }

                        if (claimWishedByOthers && bot.preferences.claim.targetUsersList.has(mentionedNick)) {
                            tags.push(["interesting", `snipe ${mentionedNick}`]);
                            isThisInteresting = true;
                            break;
                        }
                    }
                }

                const isProtected = !!$msg.querySelector("img[alt=':wishprotect:']");
                const marriageableUser = bot.getMarriageableUser({ nicknames: mentionedNicknames, ...((isProtected && interactionInfo) && { userId: interactionInfo.userId }) });

                if (isProtected) {
                    tags.push("wish-protected");
                }

                if (marriageableUser && !isThisInteresting && (claimFromListCharacters || claimFromListSeries) && (!bot.preferences.claim.onlyLastReset || bot.isLastReset())) {
                    if (claimFromListCharacters && bot.preferences.claim.characterList.has(characterName)) {
                        tags.push(["interesting", "character list"]);
                        isThisInteresting = true;
                    }

                    if (!isThisInteresting && claimFromListCharacters) {
                        const seriesName = ($msg.querySelector("div[class^='embedDescription']") as HTMLElement | null)?.innerText.split("\n")[0];

                        if (!seriesName) {
                            tags.push(["error", "no series found"]);
                            bot.log.error("Couldn't get series name from message <NotImplementedReference>", false); //# Add reference to message
                        } else if (bot.preferences.claim.seriesList.has(seriesName)) {
                            tags.push(["interesting", "series list"]);
                            isThisInteresting = true;
                        }
                    }
                }

                if (isThisInteresting) {
                    bot.log.event(EVENTS.FOUND_CHARACTER, { character: characterName });

                    if (marriageableUser) {
                        //# Verify if marriageableUser can still marry after all delay calculations (In case of multiple marriageable characters at the same time)

                        let claimDelay = bot.preferences.claim.delay;

                        if (claimDelay > 0) {
                            if (bot.preferences.claim.delayRandom && claimDelay > .1) claimDelay = randomFloat(.1, claimDelay, 2);

                            claimDelay *= 1000;
                        }

                        const canClaimImmediately = !isProtected || (interactionInfo && marriageableUser.id === interactionInfo.userId);

                        // if (!canClaimImmediately) claimDelay = 2905 + Math.max(claimDelay - 2905, 0);
                        if (!canClaimImmediately) claimDelay = _.clamp(2905, claimDelay, MAX_CLAIM_DELAY_IN_SECONDS) * 1000;

                        const thisClaim = () => {
                            marriageableUser.pressMessageButton($msg)
                                .catch(buttonError => {
                                    marriageableUser.reactToMessage($msg)
                                        .catch(reactError => bot.log.error(`User ${marriageableUser.username} couldn't claim a character: ${reactError.message}`, false));
                                });
                        };

                        if (!claimDelay) {
                            thisClaim();
                            tags.push(["will-try-marry", "no-delay"]);
                            return tags;
                        }

                        claimDelay = 2905 + Math.max(claimDelay - 2905, 0);

                        setTimeout(() => thisClaim(), claimDelay);
                        tags.push(["will-try-marry", claimDelay + "ms"]);

                        return tags;
                    }

                    tags.push("cant-marry");
                    bot.log.warn(`Can't claim character ${characterName} right now.`); //# Add reference to character message
                }

                return tags;
            }

            /// Owned characters
            const $kakeraImg: HTMLImageElement | null = $msg.querySelector("button img");

            if ($kakeraImg) {
                const kakeraCode = $kakeraImg.alt;
                let kakeraToGet: KAKERA | null = null;

                tags.push(["has-kakera", kakeraCode]);

                for (const kakera of (bot.preferences.kakera.perToken.get("all") as Set<KAKERA>)) {
                    if (KAKERAS[kakera].internalName === kakeraCode) {
                        tags.push(["want-kakera", "all"]);
                        kakeraToGet = kakera;
                        break;
                    }
                }

                if (!kakeraToGet && bot.preferences.useUsers === "logged") return tags;

                for (const botUser of bot.users) {
                    let kakeraToGetPerUser = kakeraToGet;

                    if (!kakeraToGetPerUser) {
                        for (const kakera of (bot.preferences.kakera.perToken.get(botUser.token) as Set<KAKERA>)) {
                            if (KAKERAS[kakera].internalName === kakeraCode) {
                                tags.push(["want-kakera", botUser.username || "user"]);
                                kakeraToGetPerUser = kakera;
                                break;
                            }
                        }
                    }

                    if (kakeraToGetPerUser) {
                        if (kakeraToGetPerUser === "PURPLE" || (botUser.info.get(USER_INFO.POWER) as number) >= (botUser.info.get(USER_INFO.CONSUMPTION) as number)) {
                            let claimDelay = bot.preferences.kakera.delay;

                            const thisClaim = () => {
                                botUser.pressMessageButton($msg)
                                    .catch(err => bot.log.error(`User ${botUser.username} couldn't claim kakera: ${err.message}`, false));
                            };

                            if (claimDelay > 0) {
                                if (bot.preferences.kakera.delayRandom && claimDelay > .1) claimDelay = randomFloat(.1, claimDelay, 2);

                                claimDelay *= 1000;

                                setTimeout(() => thisClaim(), claimDelay);
                                tags.push(["will-try-claimk", claimDelay + "ms"]);
                                return tags;
                            }

                            thisClaim();
                            tags.push(["will-try-claimk", "no-delay"]);
                            return tags;
                        }
                        tags.push("cant-claimk");
                    }
                }
            }

            return tags;
        }

        if (messageContent) {
            /// Handle character claims & steals
            const characterClaimMatch = LANG[bot.preferences.guild.language].regex.marryNotification.exec(messageContent.trim());

            if (characterClaimMatch || messageContent.includes(LANG[bot.preferences.guild.language].string.silver4Bonus)) {
                let usernameThatClaimed: string | undefined;
                let characterName: string | undefined;
                let botUserThatClaimed: BotUser | null = null;

                if (characterClaimMatch) {
                    usernameThatClaimed = characterClaimMatch[1];
                    characterName = characterClaimMatch[2];

                    if (usernameThatClaimed) {
                        botUserThatClaimed = bot.getUserWithCriteria((user) => user.username === usernameThatClaimed);
                    }
                }

                /// Claim & Kakera bonuses
                if (botUserThatClaimed) {
                    botUserThatClaimed.info.set(USER_INFO.CAN_MARRY, false);

                    let kakeraFromBonuses: number = 0;

                    const matchKakeraFromBronzeIV = /\n\+(\d+)\s\(.*Bronze IV.*\)/.exec(messageContent);
                    const matchKakeraFromEmeraldIV = /\n\+(\d+)\(.*Emerald IV.*\)/.exec(messageContent);

                    if (matchKakeraFromBronzeIV) {
                        const kakeraFromBronzeIV: number = Number(matchKakeraFromBronzeIV[1]);

                        kakeraFromBonuses += kakeraFromBronzeIV;
                    }

                    if (matchKakeraFromEmeraldIV) {
                        const kakeraFromEmeraldIV: number = Number(matchKakeraFromEmeraldIV[1]);

                        kakeraFromBonuses += kakeraFromEmeraldIV;
                    }

                    bot.log.event(EVENTS.CLAIM, { user: usernameThatClaimed, character: characterName, kakera: kakeraFromBonuses });

                    syncUserInfo(botUserThatClaimed);
                    //# beep
                }

                tags.push(["marry-notification", botUserThatClaimed ? (botUserThatClaimed.username || "me") : "other"]);

                const $mentions = $msg.querySelectorAll("span.mention");
                const botUsers = new Set(bot.users);
                const mentionedBotUsernames: string[] = [];

                let isMentioningMe = false;

                for (let i = 0; i < $mentions.length; i++) {
                    const mentionedNick = ($mentions[i] as HTMLSpanElement).innerText.slice(1);

                    for (const botUser of botUsers) {
                        if (botUser.nick === mentionedNick) {
                            isMentioningMe = true;

                            botUsers.delete(botUser);

                            tags.push(["mentions-me", mentionedNick]);

                            mentionedBotUsernames.push(botUser.username as string);
                            break;
                        }
                    }
                }

                /// Silver IV bonus kakera
                if (mentionedBotUsernames.length > 0) {
                    bot.log.event(EVENTS.KAKERA_SILVERIV, mentionedBotUsernames);
                }

                /// Steal
                if (isMentioningMe && !botUserThatClaimed) {
                    tags.push("steal");

                    const stealMessage = characterClaimMatch
                        ? `User ${usernameThatClaimed} claimed ${characterName} wished by you.`
                        : "A character wished by you was claimed by another user.";

                    bot.log.event(EVENTS.STEAL, { user: usernameThatClaimed, character: characterName });
                    bot.log.warn(stealMessage);
                }

                return tags;
            }

            /// Handle kakera claiming
            const $kakeraClaimStrong = $msg.querySelector("div[id^='message-content'] span[class^='emojiContainer'] + strong") as HTMLElement | null;

            if ($kakeraClaimStrong) {
                const kakeraClaimMatch = /^(.+)\s\+(\d+)$/.exec($kakeraClaimStrong.innerText);

                if (kakeraClaimMatch) {
                    const messageUsername = kakeraClaimMatch[1];
                    const kakeraQuantity = kakeraClaimMatch[2];

                    const user = bot.getUserWithCriteria((user) => user.username === messageUsername);

                    tags.push(["kakera-notification", user ? (user.username || "me") : "other"]);

                    if (user) {
                        const kakeraType = ($kakeraClaimStrong.previousElementSibling?.firstElementChild as HTMLImageElement | null)?.alt.replace(/:/g, '');

                        if (!kakeraType) {
                            tags.push(["aborted", "no kakera type found"]);

                            bot.log.error("Couldn't get kakera type from message [?]", false); //# Add reference to message
                            return tags;
                        }

                        const powerCost: number = kakeraType === KAKERAS.PURPLE.internalName ? 0 : (user.info.get(USER_INFO.CONSUMPTION) as number);

                        if (powerCost > 0) {
                            const newPower = Math.max((user.info.get(USER_INFO.POWER) as number) - powerCost, 0);

                            user.info.set(USER_INFO.POWER, newPower);
                            syncUserInfo(user);
                        }

                        bot.log.event(EVENTS.KAKERA, { user: user.username, amount: kakeraQuantity });
                    }

                    return tags;
                }
            }
        }

        return tags;
    },

    async handleNewChatAppend(nodes) {
        document.querySelector("div[class^='scrollerSpacer']")?.scrollIntoView();

        if (!bot.preferences) {
            bot.error("Couldn't read bot preferences");
            return;
        };

        nodes.forEach(async node => {
            const $msg = node as HTMLElement;

            const debugTags = await bot.processChatNode($msg);

            if (bot.preferences?.debug && debugTags && debugTags.length > 0) {
                const tagsClasses: string[] = [];
                const tagsLabels: string[] = [];

                debugTags.forEach(tag => {
                    if (typeof tag === "string") {
                        tagsClasses.push(`automudae-debug-${tag}`);
                        tagsLabels.push(tag);
                        return;
                    }

                    const [tagId, tagInfo] = tag;

                    tagsClasses.push(`automudae-debug-${tagId}`);
                    tagsLabels.push(`${tagId}: ${tagInfo}`);
                });

                $msg.dataset.automudae_debug_tags = tagsLabels.join("\n");
                $msg.classList.add(...tagsClasses);
            }

        });
    },
};

let hangingPreferencesToSync: Preferences | null = null;

const syncPreferences = (newPreferences: Preferences) => {
    if (!bot.preferences) throw Error("No preferences was found during sync.");

    if (bot.state === "idle" || bot.state === "running") {
        if (newPreferences.useUsers !== bot.preferences.useUsers || (bot.preferences.useUsers === "tokenlist" && [...newPreferences.tokenList].toString() !== [...bot.preferences.tokenList].toString())) {
            //# Notify about it
            window.location.reload();
            //# Resetup instead
            //# Then there will be a loop of resync while setting up, hanging preferences again & again
            //# Should wait for the use to stop altering tokenlist, otherwise it will keep setting up for each altered token
            return;
        }

        bot.preferences = newPreferences;
        hangingPreferencesToSync = null;
    } else if (bot.state === "setup") {
        hangingPreferencesToSync = newPreferences;
    }
};

const syncUserInfo = (user: BotUser) => {
    const userInfoData = { username: user.username, userinfo: user.info };
    const stringifiedData = JSON.stringify(userInfoData, jsonMapSetReplacer);

    chromeMessageQueue.sendMessage({ id: MESSAGES.BOT.SYNC_USER_INFO, data: stringifiedData });
};

const storeUsernameForToken = (username: string, token: string) => {
    chromeMessageQueue.sendMessage({ id: MESSAGES.BOT.STORE_USERNAME, data: { username, token } });
};

const handleExtensionMessage = (message: Message, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (!Object.hasOwn(message, "id")) return;

    switch (message.id) {
        case MESSAGES.APP.GET_STATUS:
            const response: {
                botState: BotState
                lastError?: string
                stringifiedUserStatus?: string
            } = { botState: bot.state };

            if (bot.lastErrorMessage) response.lastError = bot.lastErrorMessage;

            if ((bot.state === "idle" || bot.state === "running") && bot.hasNeededInfo()) {
                const userStatus: UserStatus = new Map();

                for (const botUser of bot.users) {
                    userStatus.set(botUser.username as string, botUser.info);
                }

                response.stringifiedUserStatus = JSON.stringify(userStatus, jsonMapSetReplacer);
            }

            sendResponse(response);
            break;
        case MESSAGES.APP.INJECTION:
            bot.preferences = JSON.parse(message.data, jsonMapSetReviver);

            bot.setup()
                .then(() => {
                    bot.state = "idle";

                    if (hangingPreferencesToSync) {
                        syncPreferences(hangingPreferencesToSync);
                    }

                    bot.toggle();
                    sendResponse();
                })
                .catch((err: Error) => {
                    bot.state = "injection_error";
                    bot.lastErrorMessage = err.message;
                    sendResponse(err.message);
                });

            /// Must return true here to keep it open waiting for async response
            /// [ref: https://developer.chrome.com/docs/extensions/mv3/messaging/#simple]
            return true;
        case MESSAGES.APP.TOGGLE:
            try {
                bot.toggle();
                sendResponse(bot.state);
            } catch (error: any) {
                sendResponse(error instanceof Error ? error.message : String(error));
            }
            break;
        case MESSAGES.APP.SYNC_PREFERENCES:
            if (bot.state === "waiting_injection" || bot.state === "error" || bot.state === "injection_error" || bot.state === "unknown") {
                sendResponse();
                return;
            }

            try {
                const newPreferences: Preferences = JSON.parse(message.data, jsonMapSetReviver);

                syncPreferences(newPreferences);
                sendResponse();
            } catch (error: any) {
                sendResponse(error instanceof Error ? error.message : String(error));
            }
            break;
        default:
            break;
    }
}

chrome.runtime.onMessage.addListener(handleExtensionMessage);

export { }