'use client'

/**
 * SkipNav — accessibility "Skip to main content" link
 *
 * Renders a link that is visually hidden until focused via keyboard.
 * Allows keyboard-only users to bypass the header/navigation.
 * Styled by `.skip-to-content` in globals.css.
 */
export default function SkipNav() {
    return (
        <a
            href="#main-content"
            className="skip-to-content"
        >
            Skip to main content
        </a>
    )
}
