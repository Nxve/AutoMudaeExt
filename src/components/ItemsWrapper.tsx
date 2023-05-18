import React from "react";
import { MenuCategory } from "../lib/app_types";

interface IItemsWrapperProps {
    currentMenuCategory: MenuCategory
    toggleMenuCategory: (category?: MenuCategory) => void
    children: JSX.Element[]
}

function ItemsWrapper(props: IItemsWrapperProps) {
    return (
        <>
            {props.children.map(child => React.cloneElement(child, {currentMenuCategory: props.currentMenuCategory, toggleMenuCategory: props.toggleMenuCategory}))}
        </>
    )
}

export default ItemsWrapper;