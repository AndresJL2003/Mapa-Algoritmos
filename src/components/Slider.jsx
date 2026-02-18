import Slider from "@mui/material/Slider";
import { styled } from "@mui/material/styles";

const SuccessSlider = styled(Slider)(() => ({
    color: "#10b981",
    height: 5,
    "& .MuiSlider-thumb": {
        width: 18,
        height: 18,
        backgroundColor: "#fff",
        border: "2px solid currentColor",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        "&:hover, &.Mui-focusVisible": {
            boxShadow: "0 2px 12px rgba(16, 185, 129, 0.4)",
        },
        "&.Mui-active": {
            boxShadow: "0 2px 12px rgba(16, 185, 129, 0.4)",
        },
    },
    "& .MuiSlider-track": {
        border: "none",
        height: 5,
    },
    "& .MuiSlider-rail": {
        color: "#3f3f46",
        opacity: 1,
        height: 5,
    },
    "& .MuiSlider-mark": {
        backgroundColor: "#3f3f46",
        height: 5,
        width: 2,
    },
    "& .MuiSlider-markLabel": {
        color: "#71717a",
        fontSize: 11,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
    },
}));

export default function StyledCustomization({ disabled, value, min, max, step, onInput, onChange, onChangeCommited, defaultValue, marks, style }) {
    return <SuccessSlider disabled={disabled} value={value} min={min} max={max} step={step} onInput={onInput} onChangeCommitted={onChangeCommited} onChange={onChange} defaultValue={defaultValue} marks={marks} style={style} />;
}