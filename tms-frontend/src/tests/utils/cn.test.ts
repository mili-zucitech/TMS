import { describe, it, expect } from 'vitest'
import { cn } from '@/utils/cn'

describe('cn (classname utility)', () => {
  it('returns a single class unchanged', () => {
    expect(cn('text-sm')).toBe('text-sm')
  })

  it('concatenates multiple classes', () => {
    expect(cn('text-sm', 'font-bold')).toBe('text-sm font-bold')
  })

  it('ignores falsy values', () => {
    expect(cn('text-sm', false && 'hidden', null, undefined)).toBe('text-sm')
  })

  it('handles conditional classes via objects', () => {
    expect(cn({ 'text-red-500': true, 'text-green-500': false })).toBe('text-red-500')
  })

  it('merges conflicting Tailwind classes (last one wins)', () => {
    // tailwind-merge should replace the first padding with the second
    const result = cn('px-4', 'px-8')
    expect(result).toBe('px-8')
  })

  it('merges conflicting text-size classes', () => {
    const result = cn('text-sm', 'text-lg')
    expect(result).toBe('text-lg')
  })

  it('works with array of classes', () => {
    const result = cn(['flex', 'items-center'])
    expect(result).toBe('flex items-center')
  })

  it('handles an empty call', () => {
    expect(cn()).toBe('')
  })

  it('handles mixed inputs', () => {
    const active = true
    const result = cn(
      'base-class',
      active && 'active-class',
      { 'conditional-class': true },
      ['array-class'],
    )
    expect(result).toContain('base-class')
    expect(result).toContain('active-class')
    expect(result).toContain('conditional-class')
    expect(result).toContain('array-class')
  })

  it('deduplicates classes via clsx+tailwind-merge', () => {
    const result = cn('p-4', 'p-4')
    expect(result).toBe('p-4')
  })
})
