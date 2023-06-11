import type { PrefLanguage } from "./bot";

interface Localization {
    string: {
        newSoulmate: string
        ownedCharacter: string
        silver4Bonus: string
        tu_daily: string
        tu_dk: string
        kl_notEnoughKakera: string
    }
    regex: {
        tu_rolls: RegExp
        tu_rollsUs: RegExp
        tu_power: RegExp
        tu_marry: RegExp
        tu_cantMarry: RegExp
        tu_kakeraConsumption: RegExp
        marryNotification: RegExp
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
            silver4Bonus: "(Silver IV bonus)",
            tu_daily: "$daily i", /// $daily is available
            tu_dk: "$dk i", /// $dk is ready
            kl_notEnoughKakera: "You n" /// You need an additional <kakera_amount>
        },
        regex: {
            tu_rolls: /have (\d+) rolls/,
            tu_rollsUs: /\(\+(\d+) \$us\)/,
            tu_power: /Power: (\d+)%/,
            tu_marry: /claim/,
            tu_cantMarry: /claim for another (.+) min/,
            tu_kakeraConsumption: /reaction consumes (\d+)%/,
            marryNotification: /(.+) and (.+) are now married/,
            noMoreRolls: /(.+), the roulette is limited/,
            ownedLookup: /^Belongs to .+ ~~ \d+ \/ \d+$/
        }
    },
    es: {
        string: {
            newSoulmate: "Es ahora tu ALMA",
            ownedCharacter: "Pertenece",
            silver4Bonus: "(Bonus de Silver IV)",
            tu_daily: "$daily es", /// $daily está disponible
            tu_dk: "$dk es", /// $dk está listo
            kl_notEnoughKakera: "Te f" /// Te faltan <kakera_amount>
        },
        regex: {
            tu_rolls: /Tienes (\d+) rolls/,
            tu_rollsUs: /\(\+(\d+) \$us\)/,
            tu_power: /Poder: (\d+)%/,
            tu_marry: /reclamar/,
            tu_cantMarry: /reclamar hasta dentro de (.+) min/,
            tu_kakeraConsumption: /kakera consume (\d+)%/,
            marryNotification: /(.+) y (.+) ahora están casados/,
            noMoreRolls: /(.+), la ruleta está limitada/,
            ownedLookup: /^Pertenece a .+ ~~ \d+ \/ \d+$/
        }
    },
    fr: {
        string: {
            newSoulmate: "Maintenant votre SOUL",
            ownedCharacter: "Appartient",
            silver4Bonus: "(bonus Silver IV)",
            tu_daily: "$daily e", /// $daily est disponible
            tu_dk: "$dk e", /// $dk est prêt
            kl_notEnoughKakera: "Il v" /// Il vous manque encore <kakera_amount>
        },
        regex: {
            tu_rolls: /avez (\d+) rolls/,
            tu_rollsUs: /\(\+(\d+) \$us\)/,
            tu_power: /Power: (\d+)%/,
            tu_marry: /vous (?:re)?marier/,
            tu_cantMarry: /avant de pouvoir vous remarier : (.+) min/,
            tu_kakeraConsumption: /kakera consomme (\d+)%/,
            marryNotification: /(.+) et (.+) sont maintenant mariés/,
            noMoreRolls: /(.+), la roulette est limitée/,
            ownedLookup: /^Appartient à .+ ~~ \d+ \/ \d+$/
        }
    },
    pt_br: {
        string: {
            newSoulmate: "Sua nova ALMA",
            ownedCharacter: "Pertence",
            silver4Bonus: "(Silver IV Bônus)",
            tu_daily: "$daily es", /// $daily está pronto
            tu_dk: "$dk es", /// $dk está pronto
            kl_notEnoughKakera: "Você p" /// Você precisa de mais <kakera_amount>
        },
        regex: {
            tu_rolls: /tem (\d+) rolls/,
            tu_rollsUs: /\(\+(\d+) \$us\)/,
            tu_power: /Power: (\d+)%/,
            tu_marry: /casar/,
            tu_cantMarry: /se casar novamente (.+) min/,
            tu_kakeraConsumption: /kakera consume (\d+)%/,
            marryNotification: /(.+) e (.+) agora são casados/,
            noMoreRolls: /(.+), os rolls são limitado/,
            ownedLookup: /^Pertence a .+ ~~ \d+ \/ \d+$/
        }
    }
};