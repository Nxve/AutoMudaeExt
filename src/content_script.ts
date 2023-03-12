import type { BotState, Preferences } from "./lib/bot";
import { BotUser } from "./lib/bot";
import { Message, MESSAGES } from "./lib/messaging";
import { jsonMapSetReviver } from "./lib/utils";

let state: BotState = "waiting_injection";
let preferences: Preferences;
const users: Set<BotUser> = new Set();

const handleExtensionMessage = (message: Message, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (!message.id) return;

    switch (message.id) {
        case MESSAGES.GET_STATE:
            sendResponse(state);
            break;
        case MESSAGES.INJECTION:
            state = "setup";
            preferences = JSON.parse(message.data, jsonMapSetReviver);

            (async () => {
                if (preferences.useUsers === "tokenlist") {
                    for (const token of preferences.tokenList) {
                        const user = new BotUser(token);

                        const initErr = await user.init();

                        if (initErr) {
                            sendResponse(initErr.message);
                            throw initErr;
                        }

                        users.add(user);
                    }
                } else {
                    const storeUsers = JSON.parse(localStorage.MultiAccountStore)?._state.users;
                    const storeTokens = JSON.parse(localStorage.tokens);

                    if (!storeUsers || !storeTokens) {
                        const err = "Couldn't retrieve information about logged users.";
                        sendResponse(err);
                        throw Error(err);
                    }

                    for (let i = 0; i < storeUsers.length; i++) {
                        const { id, username, avatar } = storeUsers[i];

                        const token = storeTokens[id];

                        if (!token) {
                            const err = `Couldn't retrieve information about user [${username}].`;
                            sendResponse(err);
                            throw Error(err);
                        }

                        const user = new BotUser(token, id, username, avatar);

                        const initErr = await user.init();

                        if (initErr) {
                            sendResponse(initErr.message);
                            throw initErr;
                        }

                        users.add(user);
                    }
                }
            })()
                .then(() => {
                    state = "running";
                    console.log(users);
                    sendResponse();
                })
                .catch((_err: Error) => {
                    state = "injection_error";
                });
                
            /// Must return true here to keep it open waiting for async response
            /// [ref: https://developer.chrome.com/docs/extensions/mv3/messaging/#simple]
            return true;
        default:
            break;
    }
}

chrome.runtime.onMessage.addListener(handleExtensionMessage);

export { }