import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/Badge'

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders with default variant styles', () => {
    render(<Badge>Default</Badge>)
    const badge = screen.getByText('Default')
    expect(badge.className).toContain('bg-primary/10')
    expect(badge.className).toContain('text-primary')
  })

  it('renders with success variant', () => {
    render(<Badge variant="success">Approved</Badge>)
    const badge = screen.getByText('Approved')
    expect(badge.className).toContain('bg-emerald-500/10')
    expect(badge.className).toContain('text-emerald-700')
  })

  it('renders with destructive variant', () => {
    render(<Badge variant="destructive">Rejected</Badge>)
    const badge = screen.getByText('Rejected')
    expect(badge.className).toContain('bg-destructive/10')
    expect(badge.className).toContain('text-destructive')
  })

  it('renders with warning variant', () => {
    render(<Badge variant="warning">Pending</Badge>)
    const badge = screen.getByText('Pending')
    expect(badge.className).toContain('bg-amber-500/10')
    expect(badge.className).toContain('text-amber-700')
  })

  it('renders with info variant', () => {
    render(<Badge variant="info">Info</Badge>)
    const badge = screen.getByText('Info')
    expect(badge.className).toContain('bg-blue-500/10')
    expect(badge.className).toContain('text-blue-700')
  })

  it('renders with outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>)
    const badge = screen.getByText('Outline')
    expect(badge.className).toContain('border-border')
  })

  it('renders with secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    const badge = screen.getByText('Secondary')
    expect(badge.className).toContain('bg-secondary')
  })

  it('renders with violet variant', () => {
    render(<Badge variant="violet">Locked</Badge>)
    const badge = screen.getByText('Locked')
    expect(badge.className).toContain('bg-violet-500/10')
  })

  it('merges custom className', () => {
    render(<Badge className="custom-badge">Custom</Badge>)
    expect(screen.getByText('Custom').className).toContain('custom-badge')
  })

  it('renders as a div element', () => {
    const { container } = render(<Badge>Tag</Badge>)
    expect(container.firstChild?.nodeName).toBe('DIV')
  })

  it('has rounded-full and text-xs classes', () => {
    render(<Badge>Tiny</Badge>)
    const badge = screen.getByText('Tiny')
    expect(badge.className).toContain('rounded-full')
    expect(badge.className).toContain('text-xs')
  })
})
