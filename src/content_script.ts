import type { BotState, Preferences } from "./lib/bot";
import { Message, MESSAGES } from "./lib/messaging";

let state: BotState = "waiting_injection";
let preferences: Preferences;

const handleExtensionMessage = (message: Message, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {    
    if (!message.id) return;

    switch (message.id) {
        case MESSAGES.GET_STATE:
            sendResponse(state);
            break;
        case MESSAGES.INJECTION:
            state = "setup";
            preferences = message.data;

            sendResponse("<Not implemented yet>");
            break;
        default:
            break;
    }
}

chrome.runtime.onMessage.addListener(handleExtensionMessage);

export { }