import type { UserStatus } from "../lib/bot/status_stats";
import { USER_INFO } from "../lib/bot";

interface IStatusPanelProps {
    userStatus: UserStatus
}

function StatusPanel({ userStatus }: IStatusPanelProps) {
    let totalRollsLeft = 0;
    let totalRollsMax = 0;
    let lowestConsumption = Infinity;
    let highestPower = -Infinity;
    let canClaimCharacter = false;
    let canRT = false;
    const arrayUserStatus = [...userStatus];

    console.log(arrayUserStatus);

    for (const [, userinfo] of userStatus) {
        totalRollsLeft += userinfo.get(USER_INFO.ROLLS_LEFT) as number;
        totalRollsMax += userinfo.get(USER_INFO.ROLLS_MAX) as number;
        lowestConsumption = Math.min(lowestConsumption, userinfo.get(USER_INFO.CONSUMPTION) as number);
        highestPower = Math.max(highestPower, userinfo.get(USER_INFO.POWER) as number);

        /// Check for falsy local var so it doesnt get to read each user marry availability unnecessarily
        if (!canClaimCharacter && userinfo.get(USER_INFO.CAN_MARRY) as boolean) canClaimCharacter = true;
        if (!canRT && userinfo.get(USER_INFO.CAN_RT) as boolean) canRT = true;
    }

    return (
        <div id="status-panel" style={{ "--user-count": 4 } as React.CSSProperties}>
            <div className="status-outer">
                <em>
                    <span>Rolls:</span>
                    <span>({totalRollsLeft}/{totalRollsMax})</span>
                </em>
                <div className="status-inner">
                    {
                        arrayUserStatus.map(([username, userinfo]) => {
                            const rollsLeft = userinfo.get(USER_INFO.ROLLS_LEFT) as number;
                            const rollsLeftUs = userinfo.get(USER_INFO.ROLLS_LEFT_US) as number | undefined;

                            const strRollsLeft: string = (rollsLeftUs != null && rollsLeftUs > 0) ? `${rollsLeft}+${rollsLeftUs}` : rollsLeft.toString();

                            return (<em key={`status-roll-${username}`}>
                                <span>{username}:</span>
                                <span>({strRollsLeft}/{userinfo.get(USER_INFO.ROLLS_MAX) as number})</span>
                            </em>)
                        }
                        )
                    }
                </div>
            </div>
            <div className="status-outer">
                <em>
                    <span>Power Available:</span>
                    <span>↓ ${highestPower}%</span>
                </em>
                <div className="status-inner">
                    {
                        arrayUserStatus.map(([username, userinfo]) =>
                            <em key={`status-power-${username}`}>
                                <span>{username}:</span>
                                <span>{userinfo.get(USER_INFO.POWER) as number}%</span>
                            </em>
                        )
                    }
                </div>
            </div>
            <div className="status-outer">
                <em>
                    <span>Power Consumption:</span>
                    <span>↑ {lowestConsumption}%</span>
                </em>
                <div className="status-inner">
                    {
                        arrayUserStatus.map(([username, userinfo]) =>
                            <em key={`status-consumption-${username}`}>
                                <span>{username}:</span>
                                <span>{userinfo.get(USER_INFO.CONSUMPTION) as number}%</span>
                            </em>
                        )
                    }
                </div>
            </div>
            <div className="status-outer">
                <em>
                    <span>Can Claim Characters:</span>
                    <span>{canClaimCharacter ? "Yes" : "No"}</span>
                </em>
                <div className="status-inner">
                    {
                        arrayUserStatus.map(([username, userinfo]) =>
                            <em key={`status-claim-${username}`}>
                                <span>{username}:</span>
                                <span>{userinfo.get(USER_INFO.CAN_MARRY) as boolean ? "Yes" : "No"}</span>
                            </em>
                        )
                    }
                </div>
            </div>
            <div className="status-outer">
                <em>
                    <span>Can RT:</span>
                    <span>{canRT ? "Yes" : "No"}</span>
                </em>
                <div className="status-inner">
                    {
                        arrayUserStatus.map(([username, userinfo]) =>
                            <em key={`status-rt-${username}`}>
                                <span>{username}:</span>
                                <span>{userinfo.get(USER_INFO.CAN_RT) as boolean ? "Yes" : "No"}</span>
                            </em>
                        )
                    }
                </div>
            </div>
        </div>
    )
}

export default StatusPanel;