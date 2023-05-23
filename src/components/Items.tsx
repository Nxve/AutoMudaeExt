import React from "react";
import { SVGS } from "../lib/svgs";
import { MenuCategory, MenuSubcategory } from "../lib/app_types";

/// Wrapper

interface IItemsWrapperProps {
    currentMenuCategory?: MenuCategory
    currentMenuSubcategory?: MenuSubcategory
    toggleMenuCategory?: (category?: MenuCategory) => void
    toggleMenuSubcategory?: (subCategory?: MenuSubcategory) => void
    children: JSX.Element[]
}

export function ItemsWrapper(props: IItemsWrapperProps) {
    return (
        <>
            {props.children.map((child, i) => React.cloneElement(child, {
                key: `menuitem-${i}`,
                currentMenuCategory: props.currentMenuCategory,
                currentMenuSubcategory: props.currentMenuSubcategory,
                toggleMenuCategory: props.toggleMenuCategory,
                toggleMenuSubcategory: props.toggleMenuSubcategory
            }))}
        </>
    )
}

/// Item

interface IItemProps {
    category: NonNullable<MenuCategory> | NonNullable<MenuSubcategory>
    label: string
    currentMenuCategory?: MenuCategory
    currentMenuSubcategory?: MenuSubcategory
    toggleMenuCategory?: (category?: MenuCategory) => void
    toggleMenuSubcategory?: (subCategory?: MenuSubcategory) => void
    isSubCategory?: boolean
}

export function Item(props: React.PropsWithChildren<IItemProps>) {
    const isSubCategory = props.isSubCategory;
    const isSelected = props.category === (isSubCategory ? props.currentMenuSubcategory : props.currentMenuCategory);

    return (
        <>
            <div className={`item-wrapper${isSubCategory ? " inner-0" : ""}`}>
                {
                    isSubCategory ?
                        <>
                            <span>{props.label}</span>
                            <button {...(isSelected && { className: "toggle" })} onClick={() => props.toggleMenuSubcategory?.(props.category as MenuSubcategory)}>
                                {SVGS.ARROW}
                            </button>
                        </> :
                        <button {...(isSelected && { className: "toggle" })} onClick={() => props.toggleMenuCategory?.(props.category as MenuCategory)}>
                            {SVGS.GEAR}
                            <span>{props.label}</span>
                            {SVGS.ARROW}
                        </button>
                }

            </div>
            {
                isSelected && React.Children.map(props.children, child => {
                    const isObject = child && typeof child === "object";

                    if (isObject && Object.hasOwn(child, "type")) {
                        const childElement = child as React.ReactElement<React.PropsWithChildren<IItemProps>>;

                        if (childElement.type === Item) {
                            return React.cloneElement(childElement, {
                                isSubCategory: true,
                                currentMenuSubcategory: props.currentMenuSubcategory,
                                toggleMenuSubcategory: props.toggleMenuSubcategory
                            });
                        }
                    }
                    return child;
                })
            }
        </>
    )
}