import type { BotLog } from "../lib/events";
import type { InfoPanelType } from "../lib/app_types"
import LogItem from "./LogItem";

interface IInfoListProps {
    infoType: NonNullable<InfoPanelType>
    logs: BotLog[]
}

function InfoList({ infoType, logs }: IInfoListProps) {
    return (
        <div id="info-list" className={`list ${infoType}`}>
            {
                logs.map((log, i) =>
                    <LogItem log={log} key={`log-${i}`} />
                )
            }
        </div>
    )
}

export default InfoList;