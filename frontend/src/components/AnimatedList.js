import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useInView } from "motion/react";
import "../styles/animated-list.css";
function AnimatedItem({ children, delay = 0, index, onMouseEnter, onClick }) {
    const ref = useRef(null);
    const inView = useInView(ref, { amount: 0.35, once: false });
    return (_jsx(motion.div, { ref: ref, "data-index": index, onMouseEnter: onMouseEnter, onClick: onClick, initial: { scale: 0.92, opacity: 0 }, animate: inView ? { scale: 1, opacity: 1 } : { scale: 0.92, opacity: 0 }, transition: { duration: 0.2, delay }, className: "animated-list__item-wrapper", children: children }));
}
export function AnimatedList({ items, onItemSelect, showGradients = true, enableArrowNavigation = true, className = "", itemClassName = "", displayScrollbar = true, initialSelectedIndex = -1, getItemKey, renderItem }) {
    const listRef = useRef(null);
    const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
    const [keyboardNav, setKeyboardNav] = useState(false);
    const [topGradientOpacity, setTopGradientOpacity] = useState(0);
    const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);
    const handleItemMouseEnter = useCallback((index) => {
        setSelectedIndex(index);
    }, []);
    const handleItemClick = useCallback((item, index) => {
        setSelectedIndex(index);
        onItemSelect?.(item, index);
    }, [onItemSelect]);
    const handleScroll = useCallback((e) => {
        const target = e.target;
        const { scrollTop, scrollHeight, clientHeight } = target;
        setTopGradientOpacity(Math.min(scrollTop / 50, 1));
        const bottomDistance = scrollHeight - (scrollTop + clientHeight);
        setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1));
    }, []);
    useEffect(() => {
        setSelectedIndex(initialSelectedIndex);
    }, [initialSelectedIndex]);
    useEffect(() => {
        if (!enableArrowNavigation)
            return;
        const handleKeyDown = (e) => {
            if (!items.length)
                return;
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setKeyboardNav(true);
                setSelectedIndex((prev) => Math.min((prev < 0 ? -1 : prev) + 1, items.length - 1));
            }
            else if (e.key === "ArrowUp") {
                e.preventDefault();
                setKeyboardNav(true);
                setSelectedIndex((prev) => Math.max((prev < 0 ? 1 : prev) - 1, 0));
            }
            else if (e.key === "Enter") {
                if (selectedIndex >= 0 && selectedIndex < items.length) {
                    e.preventDefault();
                    onItemSelect?.(items[selectedIndex], selectedIndex);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);
    useEffect(() => {
        if (!keyboardNav || selectedIndex < 0 || !listRef.current)
            return;
        const container = listRef.current;
        const selectedItem = container.querySelector(`[data-index="${selectedIndex}"]`);
        if (selectedItem) {
            const extraMargin = 50;
            const containerScrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            const itemTop = selectedItem.offsetTop;
            const itemBottom = itemTop + selectedItem.offsetHeight;
            if (itemTop < containerScrollTop + extraMargin) {
                container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
            }
            else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
                container.scrollTo({ top: itemBottom - containerHeight + extraMargin, behavior: "smooth" });
            }
        }
        setKeyboardNav(false);
    }, [selectedIndex, keyboardNav]);
    return (_jsxs("div", { className: `animated-list__container ${className}`, children: [_jsx("div", { ref: listRef, className: `animated-list__scroll ${!displayScrollbar ? "animated-list__no-scrollbar" : ""}`, onScroll: handleScroll, children: items.map((item, index) => (_jsx(AnimatedItem, { delay: 0.03 * (index % 8), index: index, onMouseEnter: () => handleItemMouseEnter(index), onClick: () => handleItemClick(item, index), children: _jsx("div", { className: `animated-list__item ${selectedIndex === index ? "selected" : ""} ${itemClassName}`, children: renderItem ? renderItem(item, index, selectedIndex === index) : _jsx("p", { children: String(item) }) }) }, getItemKey ? getItemKey(item, index) : String(index)))) }), showGradients && (_jsxs(_Fragment, { children: [_jsx("div", { className: "animated-list__gradient-top", style: { opacity: topGradientOpacity } }), _jsx("div", { className: "animated-list__gradient-bottom", style: { opacity: bottomGradientOpacity } })] }))] }));
}
