import type { BotManager, Preferences } from "./lib/bot";
import type { Message } from "./lib/messaging";
import type { KAKERA } from "./lib/mudae";
import { DISCORD_INFO } from "./lib/bot";
import { BotUser, USER_INFO } from "./lib/bot";
import { INTERVAL_THINK, INTERVAL_ROLL, MUDAE_USER_ID } from "./lib/consts";
import { MESSAGES } from "./lib/messaging";
import { KAKERAS } from "./lib/mudae";
import { getLastFromArray, jsonMapSetReviver, randomFloat } from "./lib/utils";
import { EVENTS } from "./lib/events";
import type { DiscordMessage } from "./lib/discord";

const bot: BotManager = {
    state: "waiting_injection",
    preferences: null,
    $chat: null,
    info: new Map(),
    users: new Set(),
    cdSendMessage: 0,
    cdGatherInfo: 0,
    cdRoll: 0,
    lastSeenMessageTime: 0,
    lastResetHash: "",
    nonce: Math.floor(Math.random() * 1000000),
    chatObserver: new MutationObserver(ms => ms.forEach(m => { if (m.addedNodes.length) { bot.handleNewChatAppend(m.addedNodes) } })),

    log: {
        warn(message) {
            chrome.runtime.sendMessage({ id: MESSAGES.BOT.WARN, data: message });
        },
        error(message, isCritical) {
            chrome.runtime.sendMessage({ id: MESSAGES.BOT.ERROR, data: { message, isCritical } });
        },
        event(eventType, content) {
            chrome.runtime.sendMessage({ id: MESSAGES.BOT.EVENT, data: { eventType, content } });
        },
    },

    message: {
        _DiscordMessageCache: new Map(),
        _MessageAuthorCache: new Map(),
        _fetch(messageId) {
            return new Promise((resolve, reject) => {
                if (!bot.info.has("channel_id")) {
                    reject("Unknown channel ID.");
                    return;
                }

                const channelId = bot.info.get("channel_id") as string;

                fetch(`https://discord.com/api/v9/channels/${channelId}/messages?limit=1&around=${messageId}`, {
                    "headers": {
                        "authorization": "NzAyNjk5NTExMTU5NzE4MDAx.Gvsk79.o0Cm36l4IOj5vKqN2zV0y8XNzRWuB8mA7glprU"
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
        get(messageId) {
            return new Promise((resolve, reject) => {
                if (this._DiscordMessageCache.has(messageId)) {
                    resolve(this._DiscordMessageCache.get(messageId) as DiscordMessage);
                    return;
                }

                this._fetch(messageId)
                    .then(msg => {
                        this._DiscordMessageCache.set(messageId, msg);
                        resolve(msg);
                    })
                    .catch(reject);
            });
        },
        getId($message) {
            return getLastFromArray($message.id.split("-"));
        },
        getAuthorId($message) {
            return new Promise((resolve, reject) => {
                if (this._MessageAuthorCache.has($message)) {
                    resolve(this._MessageAuthorCache.get($message) as string | null);
                    return;
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

                    if (!$avatar && !$targetMessage) {
                        /// No more messages to search for the avatar
                        // bot.log.error("Couldn't get author ID from message [?]", false); //# Add reference to message
                        break;
                    }
                }

                if ($avatar) {
                    const match = /avatars\/(\d+)\//.exec($avatar.src);

                    if (match) return resolve(match[1]);
                }

                /// Couldn't get avatar from messages, which would be really strange
                /// Or it's from an user that has no custom avatar
                /// Then it will try to fetch this message from Discord API to see it's author ID

                const messageId = this.getId($message);

                this.get(messageId)
                    .then(msg => {
                        if (!msg) {
                            resolve(null);
                            return;
                        }

                        resolve(msg.author.id);
                    })
                    .catch(reject);
            });
        },
        async isFromMudae($message) {
            const messageAuthorId = await this.getAuthorId($message);

            return (messageAuthorId != null && messageAuthorId === MUDAE_USER_ID);
        },
        async getBotUserWhoSent($message) {
            const messageAuthorId = await this.getAuthorId($message);

            if (!messageAuthorId) return null;

            for (const user of bot.users) {
                if (user.id === messageAuthorId) return user;
            }

            return null;
        },
        async getInteractionUserId($message) {
            const $avatar = $message.querySelector("img[class^='executedCommandAvatar']") as HTMLImageElement | null;

            if ($avatar) {
                const match = /avatars\/(\d+)\//.exec($avatar.src);

                if (match) return match[1];
            }

            const messageId = this.getId($message);
            const message = await this.get(messageId);

            if (!message) return null;

            const userId = message.interaction?.user.id;

            return userId || null;
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
            for (const [_, t] of this._t) {
                t.isInterval ? clearInterval(t.ref) : clearTimeout(t.ref);
            }
            this._t.clear();
        }
    },

    error(message) {
        this.toggle();
        this.state = "error";
        this.log.error(message, true);
    },

    hasNeededInfo() {
        for (const user of this.users) {
            if (!user.hasNeededInfo()) return false;
        }
        return true;
    },

    isLastReset() {
        const now = new Date(), h = now.getHours(), m = now.getMinutes();
        return (h % 3 === 2 && m >= 36) || (h % 3 === 0 && m < 36)
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

    getMarriageableUser(preferableUserNicknames?: string[]) {
        if (!preferableUserNicknames || preferableUserNicknames.length < 1) {
            return this.getUserWithCriteria((user => (user.info.get(USER_INFO.CAN_MARRY) as boolean)));
        }

        let marriageableUser;

        for (const user of this.users) {
            if (!user.nick) {
                this.error(`Couldn't get nickname for ${user.username ? ("user " + user.username) : ("token " + user.token)}`);
                return null;
            }

            if (user.info.get(USER_INFO.CAN_MARRY)) {
                marriageableUser = user;

                if (preferableUserNicknames.includes(user.nick)) break;
            }
        }

        return marriageableUser || null;
    },

    getUserWithCriteria(cb) {
        for (const user of this.users) {
            if (cb(user)) return user;
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

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, pathDiscriminator, guildId, channelId] = windowPathname.split("/");

        if (pathDiscriminator !== "channels") {
            throw Error("You must be in the desired channel.");
        }

        if (!guildId || !channelId) {
            throw Error("Couldn't retrieve active guild or channel.");
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

                const initErr = await user.init();

                if (initErr) throw initErr;

                bot.users.add(user);
            }
        } else {
            const storeUsers = JSON.parse(localStorage.MultiAccountStore)?._state.users;
            const storeTokens = JSON.parse(localStorage.tokens);

            if (!storeUsers || !storeTokens) {
                throw Error("Couldn't retrieve information about logged users.");
            }

            for (const storeUser of storeUsers) {
                const { id, username, avatar } = storeUser;

                const token = storeTokens[id];

                if (!token) {
                    throw Error(`Couldn't retrieve information about user [${username}].`);
                }

                const user = new BotUser(bot, token, id, username, avatar);

                const initErr = await user.init();

                if (initErr) throw initErr;

                bot.users.add(user);
            }
        }
    },

    toggle() {
        if (this.state !== "idle" && this.state !== "running") return;
        if (this.$chat == null) return;

        if (this.state === "idle") {
            let msToStartResetHandler = 1;
            const now = new Date();

            if (now.getMinutes() !== 37) {
                const nextReset = new Date(now);
                nextReset.setHours(now.getMinutes() > 37 ? now.getHours() + 1 : now.getHours(), 37);
                msToStartResetHandler = nextReset.getTime() - now.getTime();
            }

            this.timers.set("think", this.think, INTERVAL_THINK, true);

            this.timers.set("initHourlyResetHandler", () => {
                bot.handleHourlyReset();
                bot.timers.set("handleHourlyReset", bot.handleHourlyReset, 1 * 60 * 60 * 1000, true)
            }, msToStartResetHandler);

            this.chatObserver.observe(this.$chat, { childList: true });
            this.state = "running";
            return;
        }

        this.chatObserver.disconnect();
        this.timers.clear();
        this.users.forEach(user => {
            if (user.sendTUTimer) clearTimeout(user.sendTUTimer);
            user.info.clear();
        });
        this.state = "idle";
    },

    think() {
        if (!bot.preferences) return;

        const now = performance.now();
        const dateNow = new Date(), h = dateNow.getHours(), m = dateNow.getMinutes();

        if (!bot.hasNeededInfo()) {
            if (now - bot.cdGatherInfo < 1000) return;

            for (const user of bot.users) {
                if (!user.hasNeededInfo()) {
                    user.sendChannelMessage("$tu")
                        .catch(err => bot.log.error(`User ${user.username} couldn't send a channel message: ${err.message}`, false));
                    break;
                }
            }

            bot.cdGatherInfo = now;
            return;
        }

        const userWithRolls = bot.getUserWithCriteria(user => (user.info.get(USER_INFO.ROLLS_LEFT) as number) > 0);
        const isRollEnabled = bot.preferences.roll.enabled;

        if (isRollEnabled) {
            if (userWithRolls && now - bot.lastSeenMessageTime > INTERVAL_ROLL && now - bot.cdRoll > (INTERVAL_ROLL * .5)) {
                userWithRolls.roll()
                    .catch(err => bot.log.error(`User ${userWithRolls.username} couldn't roll: ${err.message}`, false))
                bot.cdRoll = now;
            }
        }

        if ((!isRollEnabled || (isRollEnabled && !userWithRolls)) && m > 38 && bot.isLastReset() && bot.getMarriageableUser()) {
            const currentResetHash = `${dateNow.toDateString()} ${h}`;

            if (bot.lastResetHash !== currentResetHash) {
                bot.lastResetHash = currentResetHash;

                //# if isRollEnabled auto-use $us or $rolls

                bot.log.warn("You have no more rolls, can still marry and it's the last reset.");
            }

        }

    },

    handleHourlyReset() {
        if (!bot.hasNeededInfo()) return;

        /// Forcing each user to gather their info with $tu again
        bot.users.forEach(user => user.info.delete(USER_INFO.ROLLS_LEFT));
    },

    handleNewChatAppend(nodes) {
        document.querySelector("div[class^='scrollerSpacer']")?.scrollIntoView();

        nodes.forEach(async _node => {
            if (!bot.preferences) {
                bot.error("Couldn't find preferences when handling new chat message.");
                return;
            }

            const $msg = _node as HTMLElement;

            if ($msg.tagName !== "LI") return;
            bot.lastSeenMessageTime = performance.now();

            if (!await bot.message.isFromMudae($msg)) return;

            const $previousElement = $msg.previousElementSibling
                ? ($msg.previousElementSibling.id === "---new-messages-bar" ? $msg.previousElementSibling.previousElementSibling : $msg.previousElementSibling)
                : null;

            /// Handle player commands
            if ($previousElement) {
                const $previousMessage = $previousElement as HTMLElement;

                const user = await bot.message.getBotUserWhoSent($previousMessage);

                if (user) {
                    const command = ($previousMessage.querySelector("div[id^='message-content']") as HTMLElement | null)?.innerText;
                    const mudaeResponse = ($msg.querySelector("div[id^='message-content']") as HTMLElement | null)?.innerText;

                    if (command && mudaeResponse && mudaeResponse.startsWith(`${user.username}, `)) {
                        if (command === "$tu") {
                            const matchRolls = /tem (\d+) rolls/.exec(mudaeResponse);
                            if (matchRolls) {
                                const rolls = Number(matchRolls[1]);

                                const hasRollsMax = user.info.has(USER_INFO.ROLLS_MAX);

                                if (!hasRollsMax || (user.info.get(USER_INFO.ROLLS_MAX) as number) < rolls) {
                                    user.info.set(USER_INFO.ROLLS_MAX, rolls);
                                }

                                user.info.set(USER_INFO.ROLLS_LEFT, rolls);
                            }

                            const matchPower = /Power: (\d+)%/.exec(mudaeResponse);
                            if (matchPower) {
                                const power = Number(matchPower[1]);

                                user.info.set(USER_INFO.POWER, power);
                            }

                            if (/\$rt/.test(mudaeResponse)) {
                                const cooldownRTMatch = /: (.+) min. \(\$rtu\)/.exec(mudaeResponse);

                                user.info.set(USER_INFO.CAN_RT, !cooldownRTMatch);

                                if (cooldownRTMatch) {
                                    const ms = bot.mudaeTimeToMs(cooldownRTMatch[1]);

                                    if (ms) user.setTUTimer(ms + 500);
                                }
                            } else {
                                user.info.set(USER_INFO.CAN_RT, false);
                            }

                            if (/casar/.test(mudaeResponse)) {
                                const cantMarry = /se casar novamente (.+) min/.exec(mudaeResponse);

                                user.info.set(USER_INFO.CAN_MARRY, !cantMarry);
                            }

                            const matchKakeraConsumption = /kakera consume (\d+)%/.exec(mudaeResponse);

                            if (matchKakeraConsumption) {
                                const consumption = Number(matchKakeraConsumption[1]);

                                user.info.set(USER_INFO.CONSUMPTION, consumption);
                            }

                            if (!user.hasNeededInfo()) {
                                bot.error(`Couldn't retrieve needed info for user ${user.username}. Make sure your $tu configuration exposes every needed information.`);
                                return;
                            }

                            return;
                        };
                    }
                }
            }

            if (!bot.hasNeededInfo()) return;

            const $messageContent = $msg.querySelector("div[id^='message-content']") as HTMLElement | null;

            if ($messageContent) {
                const messageContent = $messageContent.innerText;

                /// Handle character claims & steals
                const characterClaimMatch = /(.+) e (.+) agora são casados!/.exec(messageContent.trim());

                if (characterClaimMatch || messageContent.includes("(Silver IV Bônus)")) {
                    let usernameThatClaimed: string | undefined
                    let characterName: string | undefined;

                    if (characterClaimMatch) {
                        usernameThatClaimed = characterClaimMatch[1];
                        characterName = characterClaimMatch[2];
                    }

                    const user = bot.getUserWithCriteria((user) => user.username != null && user.username === usernameThatClaimed);

                    /// Claim
                    if (user) {
                        user.info.set(USER_INFO.CAN_MARRY, false);

                        bot.log.event(EVENTS.CLAIM, { user: user.username, character: characterName });
                        //# beep
                    } else {
                        const $mentions = $msg.querySelectorAll("span.mention");

                        let isIncludingMe = false;

                        for (let i = 0; i < $mentions.length; i++) {
                            const mentionedNick = ($mentions[i] as HTMLElement).innerText.slice(1);

                            for (const botUser of bot.users) {
                                if (botUser.nick === mentionedNick) {
                                    isIncludingMe = true;
                                    break;
                                }
                            }
                        }

                        /// Steal
                        if (isIncludingMe) {
                            const stealMessage = characterClaimMatch
                                ? `User ${usernameThatClaimed} claimed ${characterName} wished by you.`
                                : "A character wished by you was claimed by another user.";

                            bot.log.event(EVENTS.STEAL, { user: usernameThatClaimed, character: characterName });
                            bot.log.warn(stealMessage);
                        }
                    }

                    return;
                }

                /// Handle "no more rolls" messages
                const noMoreRollsMatch = /(.+), os rolls são limitado/.exec(messageContent);

                if (noMoreRollsMatch) {
                    for (const botUser of bot.users) {
                        if (botUser.username === noMoreRollsMatch[1]) {
                            setTimeout(() => {
                                botUser.sendChannelMessage("$tu")
                                    .catch(err => bot.log.error(`User ${botUser.username} couldn't send a channel message: ${err.message}`, false))
                            }, 250);
                            return;
                        }
                    }
                }

                const $kakeraClaimStrong = $msg.querySelector("div[id^='message-content'] span[class^='emojiContainer'] + strong") as HTMLElement | null;

                /// Handle kakera claiming
                if ($kakeraClaimStrong) {
                    const kakeraClaimMatch = /^(.+)\s\+(\d+)$/.exec($kakeraClaimStrong.innerText);

                    if (kakeraClaimMatch) {
                        const messageUsername = kakeraClaimMatch[1];
                        const kakeraQuantity = kakeraClaimMatch[2];

                        const user = bot.getUserWithCriteria((user) => user.username === messageUsername);

                        if (user) {
                            const kakeraType = ($kakeraClaimStrong.previousElementSibling?.firstElementChild as HTMLImageElement | null)?.alt.replace(/:/g, '');

                            if (!kakeraType) {
                                bot.log.error("Couldn't get kakera type from message [?]", false); //# Add reference to message
                                return;
                            }

                            const powerCost: number = kakeraType === KAKERAS.PURPLE.internalName ? 0 : (user.info.get(USER_INFO.CONSUMPTION) as number);

                            if (powerCost > 0) {
                                const newPower = (user.info.get(USER_INFO.POWER) as number) - powerCost;

                                user.info.set(USER_INFO.POWER, newPower);
                            }

                            bot.log.event(EVENTS.KAKERA, { user: user.username, amount: kakeraQuantity, type: kakeraType });
                        }

                        return;
                    }
                }
            }

            const $imageWrapper = $msg.querySelector("div[class^='embedDescription'] + div[class^='imageContent'] div[class^='imageWrapper']") as HTMLElement | null;

            /// Handle character messages
            if ($imageWrapper) {
                const $footer = $msg.querySelector("span[class^='embedFooterText']") as HTMLElement | null;

                const isCharacterLookupMessage = ($footer && (/^\d+ \/ \d+$/.test($footer.innerText) || /^Pertence a .+ ~~ \d+ \/ \d+$/.test($footer.innerText)));

                if (isCharacterLookupMessage) return;

                const characterName = ($msg.querySelector("span[class^='embedAuthorName']") as HTMLElement | null)?.innerText;

                if (!characterName) {
                    bot.log.error("Couldn't get character name from message [?]", false); //# Add reference to message
                    return;
                }

                const interactionUserId = await bot.message.getInteractionUserId($msg);

                if (interactionUserId) {
                    const user = bot.getUserWithCriteria(user => user.id === interactionUserId);

                    if (user) {
                        const rollsLeft = (user.info.get(USER_INFO.ROLLS_LEFT) as number) - 1;

                        user.info.set(USER_INFO.ROLLS_LEFT, rollsLeft);

                        const $embedDescription = $msg.querySelector("div[class^='embedDescription']") as HTMLElement | null;

                        if ($embedDescription && $embedDescription.innerText.includes("Sua nova ALMA")) {
                            bot.log.event(EVENTS.SOULMATE, { character: characterName, user: user.username });
                        }
                    }
                }

                if (!$footer || !$footer.innerText.includes("Pertence")) {
                    let isThisInteresting = false;

                    const mentionedNicknames: string[] = [...$msg.querySelectorAll("span.mention")].map($mention => ($mention as HTMLElement).innerText.slice(1));

                    for (const mentionedNick of mentionedNicknames) {
                        if (bot.getUserWithCriteria(user => user.nick === mentionedNick)) {
                            isThisInteresting = true;
                            break;
                        }
                    }

                    const marriageableUser = bot.getMarriageableUser(mentionedNicknames);

                    //# Search in a user configured list of interesting characters
                    // if (marriageableUser && !isThisInteresting && bot.isLastReset()) {
                    //     if (characterName === "hmm") {
                    //         isThisInteresting = true;
                    //     };
                    // }

                    if (isThisInteresting) {
                        bot.log.event(EVENTS.FOUND_CHARACTER, { character: characterName });

                        if (marriageableUser) {
                            //# Verify if marriageableUser can still marry after all delay calculations (In case of multiple marriageable characters at the same time)

                            let claimDelay = bot.preferences.claim.delay;

                            if (claimDelay > 0) {
                                if (bot.preferences.claim.delayRandom && claimDelay > .1) claimDelay = randomFloat(.1, claimDelay, 2);

                                claimDelay *= 1000;
                            }

                            const isProtected = !!$msg.querySelector("img[alt=':wishprotect:']");

                            if (!isProtected || (interactionUserId && marriageableUser.id === interactionUserId)) {
                                setTimeout(() => {
                                    marriageableUser.reactToMessage($msg)
                                        .catch(err => bot.log.error(`User ${marriageableUser.username} couldn't react to a message: ${err.message}`, false));
                                }, 250 + claimDelay);
                                return;
                            }

                            /// Delay to claim protected wishes
                            setTimeout(() => {
                                marriageableUser.reactToMessage($msg)
                                    .catch(err => bot.log.error(`User ${marriageableUser.username} couldn't react to a protected character: ${err.message}`, false));
                            }, 2905 + Math.max(claimDelay - 2905, 0));
                            return;
                        }

                        bot.log.warn(`Can't claim character ${characterName} right now.`); //# Add reference to character message
                    }

                    return;
                }

                /// Owned characters
                if ($footer.innerText.includes("Pertence")) {
                    const $kakeraImg: HTMLImageElement | null = $msg.querySelector("button img");

                    if ($kakeraImg) {
                        const kakeraCode = $kakeraImg.alt;
                        let kakeraToGet: KAKERA | undefined;

                        for (const kakera of (bot.preferences.kakera.perToken.get("all") as Set<KAKERA>)) {
                            if (KAKERAS[kakera].internalName === kakeraCode) {
                                kakeraToGet = kakera;
                                break;
                            }
                        }

                        for (const botUser of bot.users) {
                            if (!kakeraToGet && bot.preferences.useUsers === "tokenlist") {
                                for (const kakera of (bot.preferences.kakera.perToken.get(botUser.token) as Set<KAKERA>)) {
                                    if (KAKERAS[kakera].internalName === kakeraCode) {
                                        kakeraToGet = kakera;
                                        break;
                                    }
                                }
                            }

                            if (kakeraToGet) {
                                const powerCost = kakeraToGet === "PURPLE" ? 0 : (botUser.info.get(USER_INFO.CONSUMPTION) as number);

                                if ((botUser.info.get(USER_INFO.POWER) as number) >= powerCost) {
                                    let claimDelay = bot.preferences.kakera.delay;

                                    if (claimDelay > 0) {
                                        if (bot.preferences.kakera.delayRandom && claimDelay > .1) claimDelay = randomFloat(.1, claimDelay, 2);

                                        setTimeout(() => {
                                            botUser.reactToMessage($msg)
                                                .catch(err => bot.log.error(`User ${botUser.username} couldn't react to a kakera: ${err.message}`, false));
                                        }, claimDelay * 1000);
                                        return;
                                    }

                                    botUser.reactToMessage($msg)
                                        .catch(err => bot.log.error(`User ${botUser.username} couldn't react to a kakera: ${err.message}`, false));
                                    return;
                                }
                            }
                        }
                    }
                }
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

const handleExtensionMessage = (message: Message, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (!Object.hasOwn(message, "id")) return;

    switch (message.id) {
        case MESSAGES.APP.GET_STATE:
            sendResponse(bot.state);
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
            try {
                const newPreferences: Preferences = JSON.parse(message.data, jsonMapSetReviver);

                syncPreferences(newPreferences);
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