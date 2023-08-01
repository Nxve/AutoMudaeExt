import type { InfoPanelType } from "../../lib/app_types"
import type { Logs } from "../../lib/bot/log";
import type { Stats, UserStatus } from "../../lib/bot/status_stats";
import InfoList from "./InfoList";
import StatusPanel from "./StatusPanel";
import StatsPanel from "./StatsPanel";
import "../../styles/components/InfoPanel.css";

interface IInfoPanelProps {
    infoType: NonNullable<InfoPanelType>
    logs: Logs
    userStatus: UserStatus
    stats: Stats
}

function InfoPanel({ infoType, logs, userStatus, stats }: IInfoPanelProps) {
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
                            <StatsPanel stats={stats} />
                        </div>
            }
        </section>
    )
}

export default InfoPanel;