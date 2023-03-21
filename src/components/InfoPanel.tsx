import type { Logs } from "../lib/events";
import type { InfoPanelType } from "../lib/app_types"
import InfoList from "./InfoList";

interface IInfoPanelProps {
    infoType: NonNullable<InfoPanelType>
    logs: Logs
}

function InfoPanel({ infoType, logs }: IInfoPanelProps) {
    return (
        <section id="info-panel">
            <header>
                <span>{infoType.at(0)?.toUpperCase() + infoType.slice(1)}</span>
            </header>
            {
                (infoType === "warns" || infoType === "errors" || infoType === "events") ?
                    <InfoList infoType={infoType} logs={logs[infoType]} />
                    :
                    <div></div>
            }
        </section>
    )
}

export default InfoPanel;