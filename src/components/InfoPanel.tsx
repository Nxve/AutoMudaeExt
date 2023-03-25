import type { InfoPanelType } from "../lib/app_types"
import type { Logs } from "../lib/bot/log";
import type { UserStatus } from "../lib/bot/status_stats";
import InfoList from "./InfoList";
import StatusPanel from "./StatusPanel";
import "../styles/InfoPanel.css";

interface IInfoPanelProps {
    infoType: NonNullable<InfoPanelType>
    logs: Logs
    userStatus: UserStatus
}

function InfoPanel({ infoType, logs, userStatus }: IInfoPanelProps) {
    return (
        <section id="info-panel">
            <header>
                <span>{infoType.at(0)?.toUpperCase() + infoType.slice(1)}</span>
            </header>
            {
                (infoType === "warns" || infoType === "errors" || infoType === "events") ?
                    <InfoList infoType={infoType} logs={logs[infoType]} />
                    : (infoType === "status") ?
                        <StatusPanel userStatus={userStatus} /> :
                        <div>
                            {/* Stats */}
                        </div>
            }
        </section>
    )
}

export default InfoPanel;