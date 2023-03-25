import type { BotLog } from "../lib/bot/log";
import type { InfoPanelType } from "../lib/app_types"
import LogItem from "./LogItem";
import { useEffect, useRef } from "react";

interface IInfoListProps {
    infoType: NonNullable<InfoPanelType>
    logs: BotLog[]
}

function InfoList({ infoType, logs }: IInfoListProps) {
    const refList = useRef<HTMLDivElement>(null);

    useEffect(() => {
        refList.current?.scrollBy(0, refList.current.scrollHeight);
    }, []);

    return (
        <div id="info-list" className={`list ${infoType}`} ref={refList}>
            {
                logs.map((log, i) =>
                    <LogItem log={log} key={`log-${i}`} />
                )
            }
        </div>
    )
}

export default InfoList;