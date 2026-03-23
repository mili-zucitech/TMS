import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Spinner } from '@/components/common/Spinner'

describe('Spinner', () => {
  it('renders an SVG element', () => {
    const { container } = render(<Spinner />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has animate-spin class by default', () => {
    const { container } = render(<Spinner />)
    const svg = container.querySelector('svg')
    // SVG className is SVGAnimatedString in jsdom — use getAttribute
    expect(svg?.getAttribute('class')).toContain('animate-spin')
  })

  it('has aria-hidden for accessibility', () => {
    const { container } = render(<Spinner />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies default size classes when no className given', () => {
    const { container } = render(<Spinner />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('h-5')
    expect(svg?.getAttribute('class')).toContain('w-5')
  })

  it('applies custom className when provided', () => {
    const { container } = render(<Spinner className="h-8 w-8 text-primary" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('h-8')
    expect(svg?.getAttribute('class')).toContain('w-8')
    expect(svg?.getAttribute('class')).toContain('text-primary')
  })

  it('overrides default size when custom className is provided', () => {
    const { container } = render(<Spinner className="h-12 w-12" />)
    const svg = container.querySelector('svg')
    // Custom className replaces the default "h-5 w-5"
    expect(svg?.getAttribute('class')).toContain('h-12')
    expect(svg?.getAttribute('class')).not.toContain('h-5')
  })

  it('renders the circle and path for the spinner visual', () => {
    const { container } = render(<Spinner />)
    expect(container.querySelector('circle')).toBeInTheDocument()
    expect(container.querySelector('path')).toBeInTheDocument()
  })
})
