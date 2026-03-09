/**
 * SkipNav — accessibility "Skip to main content" link
 *
 * Renders a link that is visually hidden until focused via keyboard.
 * Allows keyboard-only users to bypass the header/navigation.
 * Styled by `.skip-to-content` in globals.css.
 *
 * NOTE: This is a server component — the label comes from the
 * parent server layout which already has dictionary access.
 * No client hydration needed for a static anchor tag.
 */
export default function SkipNav({ label }: { label: string }) {
    return (
        <a
            href="#main-content"
            className="skip-to-content"
        >
            {label}
        </a>
    )
}
