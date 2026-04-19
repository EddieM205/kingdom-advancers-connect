import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Saves and restores scroll position per route using sessionStorage.
 * Pass the ref to the scrollable container element.
 */
export default function useScrollRestoration(scrollRef) {
    const location = useLocation();
    const lastPath = useRef(location.pathname);

    // Save scroll position when navigating away
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const path = lastPath.current;

        const saveScroll = () => {
            sessionStorage.setItem(`scroll:${path}`, el.scrollTop);
        };

        // Restore scroll for current route
        const saved = sessionStorage.getItem(`scroll:${location.pathname}`);
        if (saved !== null) {
            // Defer until after paint
            requestAnimationFrame(() => {
                el.scrollTop = parseInt(saved, 10);
            });
        }

        lastPath.current = location.pathname;

        return () => {
            saveScroll();
        };
    }, [location.pathname, scrollRef]);
}