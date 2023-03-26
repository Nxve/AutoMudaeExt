import type { InfoPanelType } from "../lib/app_types";
import type { Unseen } from "../lib/bot/log";
import { SVGS } from "../lib/svgs";
import "../styles/NavBar.css";

interface INavBarProps {
    showStatusButton: boolean
    unseen: Unseen
    toggleInfoPanel: (infoPanelCategory?: InfoPanelType) => void
}

function NavBar({ showStatusButton, unseen, toggleInfoPanel }: INavBarProps) {
    return (
        <nav id="nav-bar">
            {
                showStatusButton &&
                <div className="nav-item status" data-tooltip="Status" onClick={() => toggleInfoPanel("status")}>
                    {SVGS.PERSON}
                </div>
            }
            <div className="nav-item stats" data-tooltip="Stats" onClick={() => toggleInfoPanel("stats")}>
                {SVGS.LIST_CHECKED}
            </div>
            <div className="nav-item events" data-tooltip="Events" data-notifications-count={unseen.event || null} onClick={() => toggleInfoPanel("events")}>
                {SVGS.STACK}
            </div>
            <div className="nav-item warns" data-tooltip="Warns" data-notifications-count={unseen.warn || null} onClick={() => toggleInfoPanel("warns")}>
                {SVGS.EXCLAMATION}
            </div>
            <div className="nav-item errors" data-tooltip="Errors" data-notifications-count={unseen.error || null} onClick={() => toggleInfoPanel("errors")}>
                {SVGS.EXCLAMATION}
            </div>
        </nav>
    )
};

export default NavBar;