import "../styles/components/Range.css";

interface IRangeProps {
    value: number
    onChange: React.ChangeEventHandler<HTMLInputElement>
    min?: number
    max?: number
    step?: number
}

function Range(props: IRangeProps) {
    const min = props.min || 0;
    const max = props.max || 100;
    const step = props.step || 1;

    return (
        <input
            className="input-range"
            type="range"
            min={min}
            max={max}
            step={step}
            value={props.value}
            style={{ "--value": ((props.value - min) * 100 / (max - min)) + "%" } as React.CSSProperties}
            onChange={props.onChange} />
    )
}

export default Range;