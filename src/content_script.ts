import type { BotManager } from "./lib/bot";
import type { EMOJI } from "./lib/consts";
import type { Message } from "./lib/messaging";
import type { KAKERA } from "./lib/mudae";
import { DISCORD_INFO } from "./lib/bot";
import { BotUser, USER_INFO } from "./lib/bot";
import { EMOJIS, INTERVAL_THINK, INTERVAL_ROLL, MUDAE_USER_ID } from "./lib/consts";
import { MESSAGES } from "./lib/messaging";
import { KAKERAS } from "./lib/mudae";
import { getLastFromArray, jsonMapSetReviver, pickRandom } from "./lib/utils";

const bot: BotManager = {
    state: "waiting_injection",
    preferences: null,
    $chat: null,
    info: new Map(),
    users: new Set(),
    cdSendMessage: 0,
    cdGatherInfo: 0,
    cdRoll: 0,
    lastMessageTime: 0,
    lastResetHash: "",
    nonce: Math.floor(Math.random() * 1000000),
    chatObserver: new MutationObserver(ms => ms.forEach(m => { if (m.addedNodes.length) { bot.handleNewChatAppend(m.addedNodes) } })),

    Message: {
        getId($message) {
            return getLastFromArray($message.id.split("-"));
        },
        getAuthorId($message) {
            let $targetMessage = $message;
            let $avatar: HTMLImageElement | undefined;

            while (!$avatar) {
                $avatar = $targetMessage.querySelector("img[class^='avatar']") as HTMLImageElement;
                if ($avatar) break;

                if ($targetMessage.previousElementSibling) {
                    $targetMessage = $targetMessage.previousElementSibling as HTMLElement;
                }

                while ($targetMessage && $targetMessage.tagName !== "LI") {
                    if ($targetMessage.previousElementSibling) {
                        $targetMessage = $targetMessage.previousElementSibling as HTMLElement;
                    }
                }

                if (!$avatar && !$targetMessage) {
                    //# Raise error
                    return;
                }
            }

            const match = /avatars\/(\d+)\//.exec($avatar.src);

            if (match) return match[1];
        },
        isFromMudae($message) {
            return this.getAuthorId($message) === MUDAE_USER_ID;
        },
        getUserWhoSent($message) {
            for (const user of bot.users) {
                if (user.id === this.getAuthorId($message)) return user;
            }
        }
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

        if (!match) return;

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
            if (!user.nick) return; //# Raise error

            if (user.info.get(USER_INFO.CAN_MARRY)) {
                marriageableUser = user;

                if (preferableUserNicknames.includes(user.nick)) break;
            }
        }

        return marriageableUser;
    },

    getUserWithCriteria(cb) {
        for (const user of this.users) {
            if (cb(user)) return user;
        }
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
                    user.sendChannelMessage("$tu");
                    break;
                }
            }

            bot.cdGatherInfo = now;
            return;
        }

        const userWithRolls = bot.getUserWithCriteria(user => (user.info.get(USER_INFO.ROLLS_LEFT) as number) > 0);
        const isRollEnabled = bot.preferences.roll.enabled;

        if (isRollEnabled) {
            if (userWithRolls && now - bot.lastMessageTime > INTERVAL_ROLL && now - bot.cdRoll > (INTERVAL_ROLL * .5)) {
                userWithRolls.roll();
                bot.cdRoll = now;
            }
        }

        if ((!isRollEnabled || (isRollEnabled && !userWithRolls)) && m > 38 && bot.isLastReset() && bot.getMarriageableUser()) {
            const currentResetHash = `${dateNow.toDateString()} ${h}`;

            if (bot.lastResetHash !== currentResetHash) {
                bot.lastResetHash = currentResetHash;

                //# if isRollEnabled auto-use $us or $rolls
                //# notify about last reset can still marry
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

        nodes.forEach(_node => {
            if (!bot.preferences) return; //# raise error

            const $msg = _node as HTMLElement;

            if ($msg.tagName !== "LI") return;
            bot.lastMessageTime = performance.now();

            if (!bot.Message.isFromMudae($msg)) return;

            const $previousElement = $msg.previousElementSibling
                ? ($msg.previousElementSibling.id === "---new-messages-bar" ? $msg.previousElementSibling.previousElementSibling : $msg.previousElementSibling)
                : null;

            /// Handle player commands
            if ($previousElement) {
                const $previousMessage = $previousElement as HTMLElement;

                const user = bot.Message.getUserWhoSent($previousMessage);

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
                                bot.toggle();

                                const errMsg = `Couldn't retrieve needed info for user [${user.username}]. Make sure your $tu configuration exposes every needed information.`;
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
                    // let characterName: string | undefined;

                    if (characterClaimMatch) {
                        usernameThatClaimed = characterClaimMatch[1];
                        // characterName = characterClaimMatch[2];
                    }

                    const user = bot.getUserWithCriteria((user) => user.username === usernameThatClaimed);

                    /// Claim
                    if (user) {
                        user.info.set(USER_INFO.CAN_MARRY, false);

                        //# Reenable
                        // if (bot.preferences.notifications.enabled.has("claimcharacter")) notify;
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
                            // if (bot.preferences.notifications.enabled.has("wishsteal")) notify;
                        }
                    }

                    return;
                }

                /// Handle "no more rolls" messages
                const noMoreRollsMatch = /(.+), os rolls são limitado/.exec(messageContent);

                if (noMoreRollsMatch) {
                    for (const botUser of bot.users) {
                        if (botUser.username === noMoreRollsMatch[1]) {
                            setTimeout(() => botUser.sendChannelMessage("$tu"), 250);
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
                        // const kakeraQuantity = kakeraClaimMatch[2];

                        const user = bot.getUserWithCriteria((user) => user.username === messageUsername);

                        if (user) {
                            const kakeraType = ($kakeraClaimStrong.previousElementSibling?.firstElementChild as HTMLImageElement | null)?.alt.replace(/:/g, '');

                            if (!kakeraType) return; //# Raise error

                            const powerCost: number = kakeraType === KAKERAS.PURPLE.internalName ? 0 : (user.info.get(USER_INFO.CONSUMPTION) as number);

                            if (powerCost > 0) {
                                const newPower = (user.info.get(USER_INFO.POWER) as number) - powerCost;

                                user.info.set(USER_INFO.POWER, newPower);
                            }
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
                const $replyAvatar = $msg.querySelector("img[class^='executedCommandAvatar']") as HTMLImageElement | null;
                let replyUserId: string | undefined;

                if (!characterName) return; //# raise error

                if ($replyAvatar) {
                    replyUserId = /avatars\/(\d+)\//.exec($replyAvatar.src)?.[1];

                    if (!replyUserId) return; //# raise error

                    const user = bot.getUserWithCriteria((user) => user.id === replyUserId);

                    if (user) {
                        const rollsLeft = (user.info.get(USER_INFO.ROLLS_LEFT) as number) - 1;

                        user.info.set(USER_INFO.ROLLS_LEFT, rollsLeft);

                        const $embedDescription = $msg.querySelector("div[class^='embedDescription']") as HTMLElement | null;

                        if ($embedDescription && $embedDescription.innerText.includes("Sua nova ALMA")) {
                            //# notify about new soulmate
                        }
                    }
                }

                if (!$footer || !$footer.innerText.includes("Pertence")) {
                    let $interestingCharacterMsg: HTMLElement | null | undefined;
                    let isWished: boolean | undefined;

                    const mentionedNicknames: string[] = [...$msg.querySelectorAll("span.mention")].map($mention => ($mention as HTMLElement).innerText.slice(1));

                    for (const mentionedNick of mentionedNicknames) {
                        if (bot.getUserWithCriteria(user => user.nick === mentionedNick)) {
                            $interestingCharacterMsg = $msg;
                            isWished = true;
                            break;
                        }
                    }

                    const marriageableUser = bot.getMarriageableUser(mentionedNicknames);

                    //# Search in a user configured list of interesting characters
                    // if (marriageableUser && !$interestingCharacterMsg && bot.isLastReset()) {
                    //     if (characterName === "hmm") {
                    //         $interestingCharacterMsg = $msg;
                    //     };
                    // }

                    if ($interestingCharacterMsg) {
                        //# notify about found character

                        if (marriageableUser) {
                            //# Verify if marriageableUser can still marry after all delay calculations (In case of multiple marriageable characters at the same time)

                            if (!isWished) {
                                //# Remove this hardcoded delay
                                setTimeout(() => marriageableUser.reactToMessage($msg, pickRandom(Object.values(EMOJIS))), 8500);
                                return;
                            }

                            const isProtected = !!$msg.querySelector("img[alt=':wishprotect:']");

                            if (!isProtected || (isProtected && marriageableUser.id === replyUserId)) {
                                bot.observeToReact($msg, marriageableUser);
                                return;
                            }

                            /// Delay to claim protected wishes
                            setTimeout(() => bot.observeToReact($msg, marriageableUser), 2905);
                            return;
                        }

                        //# notify about cant claim
                    }

                    return;
                }

                /// Owned characters
                if ($footer.innerText.includes("Pertence")) {
                    bot.observeToReact($msg);
                }

                return;
            }
        });
    },

    observeToReact($message, userToReact?) {
        let checkCount = 0;

        const observer: any = setInterval(() => {
            if (!$message || checkCount++ >= 30) return clearInterval(observer);

            const $reactionImg: HTMLImageElement | null = $message.querySelector("button img");

            if (!$reactionImg) return;

            clearInterval(observer);

            if (userToReact) {
                const emoji: EMOJI | undefined = EMOJIS[$reactionImg.alt as keyof typeof EMOJIS];

                userToReact.reactToMessage($message, emoji);
                return;
            }

            if (!bot.preferences || !bot.preferences.kakera.perToken.has("all")){
                return; //# Raise error
            }

            const kakeraCode = $reactionImg.alt;
            let kakeraToGet: KAKERA | undefined;

            for (const kakera of (bot.preferences.kakera.perToken.get("all") as Set<KAKERA>)) {
                if (KAKERAS[kakera].internalName === kakeraCode){
                    kakeraToGet = kakera;
                    break;
                }
            }

            for (const botUser of bot.users) {
                if (!kakeraToGet){
                    for (const kakera of (bot.preferences.kakera.perToken.get(botUser.token) as Set<KAKERA>)) {
                        if (KAKERAS[kakera].internalName === kakeraCode){
                            kakeraToGet = kakera;
                            break;
                        }
                    }
                }

                if (kakeraToGet){
                    const powerCost = kakeraToGet === "PURPLE" ? 0 : (botUser.info.get(USER_INFO.CONSUMPTION) as number);

                    if ((botUser.info.get(USER_INFO.POWER) as number) >= powerCost) {
                        botUser.reactToMessage($message);
                        return;
                    }
                }
            }
        }, 100);
    }
};

const handleExtensionMessage = (message: Message, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (!Object.hasOwn(message, "id")) return;

    switch (message.id) {
        case MESSAGES.GET_STATE:
            sendResponse(bot.state);
            break;
        case MESSAGES.INJECTION:
            bot.preferences = JSON.parse(message.data, jsonMapSetReviver);

            bot.setup()
                .then(() => {
                    bot.state = "idle";
                    sendResponse();
                    bot.toggle();
                })
                .catch((err: Error) => {
                    bot.state = "injection_error";
                    sendResponse(err);
                });

            /// Must return true here to keep it open waiting for async response
            /// [ref: https://developer.chrome.com/docs/extensions/mv3/messaging/#simple]
            return true;
        case MESSAGES.TOGGLE:
            try {
                bot.toggle();
                sendResponse(bot.state);
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