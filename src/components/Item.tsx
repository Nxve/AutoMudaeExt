import { MenuCategory } from "../lib/app_types";
import { SVGS } from "../lib/svgs";

interface IItemProps extends React.PropsWithChildren {
    category: NonNullable<MenuCategory>
    label: string
    currentMenuCategory?: MenuCategory
    toggleMenuCategory?: (category?: MenuCategory) => void
}

function Item(props: IItemProps) {
    const isCategorySelected = props.currentMenuCategory === props.category;

    return (
        <>
            <div className="item-wrapper">
                <button {...(isCategorySelected && { className: "toggle" })} onClick={() => props.toggleMenuCategory?.(props.category)}>
                    {SVGS.GEAR}
                    <span>{props.label}</span>
                    {SVGS.ARROW}
                </button>
            </div>
            {
                isCategorySelected && props.children
            }
        </>
    )
}

export default Item;