import type { Stats } from "../lib/bot/status_stats";
import _ from "lodash";
import { reduceInnerArraysLength } from "../lib/utils";

interface IStatsPanelProps {
    stats: Stats
}

function StatsPanel({ stats }: IStatsPanelProps) {
    const kakeraUsernames = Object.keys(stats.kakera);

    const totalKakera = _.sum(Object.values(stats.kakera));
    const totalCharacters = Object.values(stats.characters).reduce(reduceInnerArraysLength, 0);
    const totalSoulmates = Object.values(stats.soulmates).reduce(reduceInnerArraysLength, 0);

    return (
        <div id="stats-panel">
            <div className="row-outer">
                <em>
                    <span>Kakera:</span>
                    <span>{totalKakera}</span>
                </em>
                <div className="row-inner" style={{ "--inner-rows-count": kakeraUsernames.length } as React.CSSProperties}>
                    {
                        kakeraUsernames.map(username =>
                            <em key={`stats-kakera-${username}`}>
                                <span>{username}:</span>
                                <span>{stats.kakera[username]}</span>
                            </em>
                        )
                    }
                </div>
            </div>
            <div className="row-outer">
                <em>
                    <span>Claimed characters:</span>
                    <span>{totalCharacters}</span>
                </em>
                <div className="row-inner" style={{ "--inner-rows-count": totalCharacters } as React.CSSProperties}>
                    {
                        Object.keys(stats.characters).map(username =>
                            <>
                                {stats.characters[username].map(characterName =>
                                    <em key={`stats-characters-${username}-${characterName}`}>
                                        <span>{username}:</span>
                                        <span>{characterName}</span>
                                    </em>)
                                }
                            </>
                        )
                    }
                </div>
            </div>
            <div className="row-outer">
                <em>
                    <span>New soulmates:</span>
                    <span>{totalSoulmates}</span>
                </em>
                <div className="row-inner" style={{ "--inner-rows-count": totalSoulmates } as React.CSSProperties}>
                    {
                        Object.keys(stats.soulmates).map(username =>
                            <>
                                {stats.soulmates[username].map(characterName =>
                                    <em key={`stats-soulmates-${username}-${characterName}`}>
                                        <span>{username}:</span>
                                        <span>{characterName}</span>
                                    </em>)
                                }
                            </>
                        )
                    }
                </div>
            </div>
            <div className="row-outer">
                <em>
                    <span>Stolen characters:</span>
                    <span>{stats.steals.length}</span>
                </em>
                <div className="row-inner" style={{ "--inner-rows-count": stats.steals.length } as React.CSSProperties}>
                    {
                        stats.steals.map(({ character, user }) =>
                            <em key={`stats-steals-${character}-${user}`}>
                                <span>{character || "?"}</span>
                                <span>by {user || "?"}</span>
                            </em>
                        )
                    }
                </div>
            </div>
        </div>
    )
}

export default StatsPanel;