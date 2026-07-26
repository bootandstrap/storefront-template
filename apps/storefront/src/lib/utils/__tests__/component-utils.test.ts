import React from 'react'
import { describe, expect, it } from 'vitest'
import { cx, sortCx } from '../cn'
import {
    isClassComponent,
    isForwardRefComponent,
    isFunctionComponent,
    isReactComponent,
} from '../is-react-component'

describe('class and component utilities', () => {
    it('merges conflicting classes and preserves style maps for IntelliSense', () => {
        expect(cx('p-2 p-4 text-display-sm text-display-lg')).toBe('p-4 text-display-lg')
        const styles = { button: 'px-2 py-1' }
        expect(sortCx(styles)).toBe(styles)
    })

    it('detects function, class and forwardRef React components', () => {
        function FunctionComponent() {
            return null
        }
        class ClassComponent extends React.Component {
            render() {
                return null
            }
        }
        const ForwardRefComponent = React.forwardRef<HTMLDivElement>(() => null)
        ForwardRefComponent.displayName = 'ForwardRefComponent'

        expect(isFunctionComponent(FunctionComponent)).toBe(true)
        expect(isClassComponent(ClassComponent)).toBe(true)
        expect(isForwardRefComponent(ForwardRefComponent)).toBe(true)
        expect(isReactComponent(ForwardRefComponent)).toBe(true)
        expect(isReactComponent('div')).toBe(false)
    })
})
