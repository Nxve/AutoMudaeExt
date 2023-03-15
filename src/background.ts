import type { Message } from "./lib/messaging";
import { MESSAGES } from "./lib/messaging";

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
});

export { }