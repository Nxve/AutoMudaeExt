import type { PrefLanguage } from "./bot";

interface Localization {
    string: {
        newSoulmate: string
        ownedCharacter: string
        silver4Bonus: string
    }
    regex: {
        tu_rolls: RegExp
        tu_rolls_us: RegExp
        tu_power: RegExp
        tu_marry: RegExp
        tu_cant_marry: RegExp
        tu_kakera_consumption: RegExp
        marry_notification: RegExp
        noMoreRolls: RegExp
        ownedLookup: RegExp
    }
}

export const LANG: {
    [Lang in PrefLanguage]: Localization
} = {
    en: {
        string: {
            newSoulmate: "Now your SOUL",
            ownedCharacter: "Belongs",
            silver4Bonus: "(Silver IV bonus)"
        },
        regex: {
            tu_rolls: /have (\d+) rolls/,
            tu_rolls_us: /\(\+(\d+) \$us\)/,
            tu_power: /Power: (\d+)%/,
            tu_marry: /claim/,
            tu_cant_marry: /claim for another (.+) min/,
            tu_kakera_consumption: /reaction consumes (\d+)%/,
            marry_notification: /(.+) and (.+) are now married/,
            noMoreRolls: /(.+), the roulette is limited/,
            ownedLookup: /^Belongs to .+ ~~ \d+ \/ \d+$/
        }
    },
    es: {
        string: {
            newSoulmate: "Es ahora tu ALMA",
            ownedCharacter: "Pertenece",
            silver4Bonus: "(Bonus de Silver IV)"
        },
        regex: {
            tu_rolls: /Tienes (\d+) rolls/,
            tu_rolls_us: /\(\+(\d+) \$us\)/,
            tu_power: /Poder: (\d+)%/,
            tu_marry: /reclamar/,
            tu_cant_marry: /reclamar hasta dentro de (.+) min/,
            tu_kakera_consumption: /kakera consume (\d+)%/,
            marry_notification: /(.+) y (.+) ahora están casados/,
            noMoreRolls: /(.+), la ruleta está limitada/,
            ownedLookup: /^Pertenece a .+ ~~ \d+ \/ \d+$/
        }
    },
    fr: {
        string: {
            newSoulmate: "Maintenant votre SOUL",
            ownedCharacter: "Appartient",
            silver4Bonus: "(bonus Silver IV)"
        },
        regex: {
            tu_rolls: /avez (\d+) rolls/,
            tu_rolls_us: /\(\+(\d+) \$us\)/,
            tu_power: /Power: (\d+)%/,
            tu_marry: /vous (?:re)?marier/,
            tu_cant_marry: /avant de pouvoir vous remarier : (.+) min/,
            tu_kakera_consumption: /kakera consomme (\d+)%/,
            marry_notification: /(.+) et (.+) sont maintenant mariés/,
            noMoreRolls: /(.+), la roulette est limitée/,
            ownedLookup: /^Appartient à .+ ~~ \d+ \/ \d+$/
        }
    },
    pt_br: {
        string: {
            newSoulmate: "Sua nova ALMA",
            ownedCharacter: "Pertence",
            silver4Bonus: "(Silver IV Bônus)"
        },
        regex: {
            tu_rolls: /tem (\d+) rolls/,
            tu_rolls_us: /\(\+(\d+) \$us\)/,
            tu_power: /Power: (\d+)%/,
            tu_marry: /casar/,
            tu_cant_marry: /se casar novamente (.+) min/,
            tu_kakera_consumption: /kakera consume (\d+)%/,
            marry_notification: /(.+) e (.+) agora são casados/,
            noMoreRolls: /(.+), os rolls são limitado/,
            ownedLookup: /^Pertence a .+ ~~ \d+ \/ \d+$/
        }
    }
};