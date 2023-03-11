import type { BotState } from "./lib/bot";
import { Message, MESSAGES } from "./lib/messaging";

let state: BotState = "waiting_injection";

const handleExtensionMessage = (message: Message, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {    
    if (!message.id) return;

    switch (message.id) {
        case MESSAGES.GET_STATE:
            sendResponse(state);
            break;    
        default:
            break;
    }
}

chrome.runtime.onMessage.addListener(handleExtensionMessage);

export { }