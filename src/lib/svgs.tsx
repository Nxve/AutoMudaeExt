import { ReactComponent as SVG_PAUSE_FILL } from "../svg/pause_fill.svg"
import { ReactComponent as SVG_ARROW_FILL } from "../svg/arrow_fill.svg"
import { ReactComponent as SVG_ARROW } from "../svg/arrow_lines.svg"
import { ReactComponent as SVG_GEAR } from "../svg/gear.svg"
import { ReactComponent as SVG_PLUS } from "../svg/plus.svg"
import { ReactComponent as SVG_X } from "../svg/x.svg"
import { ReactComponent as SVG_EXCLAMATION_DIAMOND } from "../svg/exclamation_diamond.svg"
import { ReactComponent as SVG_EXCLAMATION } from "../svg/exclamation.svg"
import { ReactComponent as SVG_LIST_CHECKED } from "../svg/list_checked.svg"
import { ReactComponent as SVG_STACK } from "../svg/stack.svg"

export const SVGS = {
    PAUSE_FILL: <SVG_PAUSE_FILL/>,
    ARROW_FILL: <SVG_ARROW_FILL/>,
    ARROW: <SVG_ARROW/>,
    GEAR: <SVG_GEAR/>,
    PLUS: <SVG_PLUS/>,
    X: <SVG_X/>,
    EXCLAMATION_DIAMOND: <SVG_EXCLAMATION_DIAMOND/>,
    EXCLAMATION: <SVG_EXCLAMATION/>,
    LIST_CHECKED: <SVG_LIST_CHECKED/>,
    STACK: <SVG_STACK/>
} as const;