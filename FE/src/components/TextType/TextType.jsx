import { useState, useEffect, useRef } from 'react';

export default function TextType({
    texts,
    typingSpeed = 100,
    pauseDuration = 1500,
    showCursor = true,
    cursorCharacter = '|',
    cursorBlinkDuration = 0.5,
}) {
    const [displayedText, setDisplayedText] = useState('');
    const [charIndex, setCharIndex] = useState(0);
    const [showCursorBlink, setShowCursorBlink] = useState(true);
    const [isInView, setIsInView] = useState(false);
    const ref = useRef(null);

    const currentText = texts[0];
    const isTypingComplete = charIndex === currentText.length;

    // Intersection Observer - detect when component enters viewport
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isInView) {
                    setIsInView(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [isInView]);

    // Typing effect - only when in view
    useEffect(() => {
        if (!isInView || isTypingComplete) return;

        const timer = setTimeout(() => {
            setDisplayedText(currentText.substring(0, charIndex + 1));
            setCharIndex(charIndex + 1);
        }, typingSpeed);

        return () => clearTimeout(timer);
    }, [charIndex, currentText, typingSpeed, isTypingComplete, isInView]);

    // Cursor blink effect
    useEffect(() => {
        if (!showCursor) return;

        const blinkTimer = setInterval(() => {
            setShowCursorBlink((prev) => !prev);
        }, cursorBlinkDuration * 1000);

        return () => clearInterval(blinkTimer);
    }, [showCursor, cursorBlinkDuration]);

    return (
        <span ref={ref}>
            {displayedText}
            {showCursor && isTypingComplete && (
                <span style={{ opacity: showCursorBlink ? 1 : 0, transition: 'opacity 0.1s' }}>
                    {cursorCharacter}
                </span>
            )}
        </span>
    );
}
