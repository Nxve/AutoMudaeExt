export const MESSAGES = {
    APP: {
        GET_STATUS: "get_status",
        INJECTION: "injection",
        TOGGLE: "toggle",
        SYNC_PREFERENCES: "sync_preferences",
        GET_EVERYTHING: "get_everything",
        CLEAR_UNSEEN: "clear_unseen"
    },
    BOT: {
        WARN: "warn",
        ERROR: "error",
        EVENT: "event",
        SYNC_USER_INFO: "sync_user_info",
        STORE_USERNAME: "store_username"
    },
} as const;

export type MessageID = typeof MESSAGES.APP[keyof typeof MESSAGES.APP] | typeof MESSAGES.BOT[keyof typeof MESSAGES.BOT];

export interface Message {
    id: MessageID
    data?: any
};

export class ChromeMessageQueue {
    private messages: Message[] = [];
    private isRunning: boolean = false;

    private async run() {
        this.isRunning = true;

        while (this.messages.length > 0) {
            const message = this.messages.shift() as Message;

            await chrome.runtime.sendMessage<Message>(message);
        }

        this.isRunning = false;
    }

    public sendMessage(message: Message) {
        this.messages.push(message);

        if (!this.isRunning){
            this.run();
        }
    }
}