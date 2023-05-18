import type { BotLog, ErrorLog, EventLog, WarnLog } from "../../lib/bot/log";
import { LOG_TYPES } from "../../lib/bot/log";
import { EVENTS } from "../../lib/bot/event";
import { MUDAE_SILVERIV_KAKERA_BONUS } from "../../lib/consts";

//# Add icons, colors and such (Kakera type as icon)
function EventContent({ eventLog }: { eventLog: EventLog }) {
    if (eventLog.content.eventType === EVENTS.CLAIM) {
        const { character, user, kakera } = eventLog.content.eventData;
        return (
            <span>{`${user} claimed ${character}${kakera > 0 ? ` (+${kakera} kakera)` : ""}`}</span>
        )
    }

    if (eventLog.content.eventType === EVENTS.FOUND_CHARACTER) {
        const { character } = eventLog.content.eventData;
        return (
            <span>{`Character found: ${character}`}</span>
        )
    }

    if (eventLog.content.eventType === EVENTS.KAKERA) {
        const { user, amount, type } = eventLog.content.eventData;
        return (
            <span>{`${user} obtained ${amount} kakera`}</span>
        )
    }

    if (eventLog.content.eventType === EVENTS.SOULMATE) {
        const { character, user } = eventLog.content.eventData;
        return (
            <span>{`${user}'s new soulmate: ${character}`}</span>
        )
    }

    if (eventLog.content.eventType === EVENTS.STEAL) {
        const { character, user } = eventLog.content.eventData;
        return (
            <span>{`${character} was stolen by ${user}`}</span>
        )
    }

    if (eventLog.content.eventType === EVENTS.KAKERA_SILVERIV) {
        const silverIVUsernames: string[] = eventLog.content.eventData;
        return (
            <span>{`${silverIVUsernames.join(", ")} obtained ${MUDAE_SILVERIV_KAKERA_BONUS} kakera${silverIVUsernames.length > 0 ? " each" : ""} from Silver IV bonus`}</span>
        )
    }

    return (
        <span>{"{Unformatted event}"}</span>
    )
}

function LogItem({ log }: { log: BotLog }) {
    return (
        <div className={"info-list-item" + (log.type === LOG_TYPES.ERROR && (log as ErrorLog).content.isCritical ? " critical" : "")}>
            <span className="time">{log.time}</span>
            {
                log.type === LOG_TYPES.WARN ?
                    <span>{(log as WarnLog).content}</span> :
                    log.type === LOG_TYPES.ERROR ?
                        <span>{(log as ErrorLog).content.message}</span> :
                        <EventContent eventLog={log as EventLog} />
            }
        </div>
    )
}

export default LogItem;