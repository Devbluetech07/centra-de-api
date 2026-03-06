import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from "react";
export function SignatureCanvas({ onChange }) {
    const wrapperRef = useRef(null);
    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const [hasStroke, setHasStroke] = useState(false);
    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper)
            return;
        const dpr = window.devicePixelRatio || 1;
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        const w = wrapper.clientWidth || 300;
        const h = Math.max(140, Math.min(200, w * 0.28));
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const context = canvas.getContext("2d");
        if (!context)
            return;
        context.scale(dpr, dpr);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, w, h);
        context.lineJoin = "round";
        context.lineCap = "round";
        context.strokeStyle = "#101820";
        context.lineWidth = 2.4;
    }, []);
    const prevWidthRef = useRef(0);
    useEffect(() => {
        initCanvas();
        const wrapper = wrapperRef.current;
        if (!wrapper)
            return;
        const observer = new ResizeObserver((entries) => {
            const newWidth = entries[0]?.contentRect.width ?? 0;
            if (Math.abs(newWidth - prevWidthRef.current) < 4)
                return;
            prevWidthRef.current = newWidth;
            initCanvas();
            setHasStroke(false);
            onChange("");
        });
        observer.observe(wrapper);
        return () => observer.disconnect();
    }, [initCanvas, onChange]);
    function getPos(event) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.offsetWidth / rect.width;
        const scaleY = canvas.offsetHeight / rect.height;
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }
    function startDrawing(event) {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context)
            return;
        const { x, y } = getPos(event);
        isDrawingRef.current = true;
        context.beginPath();
        context.moveTo(x, y);
    }
    function draw(event) {
        if (!isDrawingRef.current)
            return;
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context)
            return;
        const { x, y } = getPos(event);
        context.lineTo(x, y);
        context.stroke();
        if (!hasStroke)
            setHasStroke(true);
    }
    function finishDrawing() {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        isDrawingRef.current = false;
        if (hasStroke) {
            onChange(canvas.toDataURL("image/png"));
        }
    }
    function clearCanvas() {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const context = canvas.getContext("2d");
        if (!context)
            return;
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        context.clearRect(0, 0, w, h);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, w, h);
        setHasStroke(false);
        onChange("");
    }
    return (_jsxs("div", { ref: wrapperRef, className: "signature-canvas-wrapper", children: [_jsx("canvas", { ref: canvasRef, className: "signature-canvas", onPointerDown: startDrawing, onPointerMove: draw, onPointerUp: finishDrawing, onPointerLeave: finishDrawing }), !hasStroke && (_jsx("div", { className: "signature-hint", children: "Desenhe sua assinatura aqui" })), _jsxs("div", { className: "row", style: { flexDirection: "row", alignItems: "center", gap: "8px" }, children: [_jsx("button", { type: "button", className: "button button-secondary", onClick: clearCanvas, children: "LIMPAR" }), _jsx("span", { className: "small-text", children: hasStroke ? "assinatura pronta para envio" : "toque ou clique para comecar" })] })] }));
}
