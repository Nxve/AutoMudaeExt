import type { MenuList } from "../lib/app_types";
import { SVGS } from "../lib/svgs";
import "../styles/components/ListControlButton.css";

interface IListControlButtonProps {
    list: MenuList
    lockedLists: Set<MenuList>
    clickHandler: (list: MenuList) => any
}

interface IClearProps extends IListControlButtonProps {
    clearingList: MenuList | null
}

function Clear(props: IClearProps) {
    const isClearing = props.clearingList === props.list;

    return (
        <button disabled={props.lockedLists.has(props.list)} className={"list-button-red" + (isClearing ? "2" : "1")} data-tooltip={isClearing ? "Sure?" : "Clear"} onClick={() => props.clickHandler(props.list)}>
            {SVGS.X}
        </button>
    )
}

function Add(props: IListControlButtonProps) {
    return (
        <button disabled={props.lockedLists.has(props.list)} className={"list-button-green"} data-tooltip="Add" onClick={() => props.clickHandler(props.list)}>
            {SVGS.PLUS}
        </button>
    )
}

const ListControlButton = { Add, Clear };

export default ListControlButton;