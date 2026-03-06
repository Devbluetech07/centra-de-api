import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useCallback } from "react";
export function TypedSignatureCanvas({ text, onChange }) {
    const wrapperRef = useRef(null);
    const canvasRef = useRef(null);
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper)
            return;
        const dpr = window.devicePixelRatio || 1;
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        const w = wrapper.clientWidth || 300;
        const h = Math.max(120, Math.min(180, w * 0.28));
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
        const fontSize = Math.max(22, Math.min(46, w * 0.06));
        context.fillStyle = "#0f172a";
        context.font = `${fontSize}px 'Segoe Script', 'Lucida Handwriting', cursive`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        const value = text.trim();
        if (value) {
            context.fillText(value, w / 2, h / 2, w - 20);
        }
        else {
            context.fillStyle = "#64748b";
            context.font = `${Math.max(14, fontSize * 0.42)}px 'Segoe UI', Arial, sans-serif`;
            context.fillText("Digite seu nome para gerar a assinatura", w / 2, h / 2);
        }
        onChange(canvas.toDataURL("image/png"));
    }, [text, onChange]);
    useEffect(() => {
        render();
        const handleResize = () => render();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [render]);
    return (_jsx("div", { ref: wrapperRef, className: "signature-canvas-wrapper", children: _jsx("canvas", { ref: canvasRef, className: "signature-canvas" }) }));
}
