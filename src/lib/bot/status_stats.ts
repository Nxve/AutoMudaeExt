import type { UserInfo } from "../bot";

export type UserStatus = Map<string, Map<UserInfo, unknown>>;

export interface Stats {
    characters: {
        [username: string]: string[]
    }
    soulmates: {
        [username: string]: string[]
    }
    steals: { character: string | null, user: string | null }[]
    kakera: {
        [username: string]: number
    }
};

export const blankStats = (): Stats => ({
    characters: {},
    soulmates: {},
    steals: [],
    kakera: {}
});