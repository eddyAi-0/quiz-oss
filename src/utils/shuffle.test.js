import { describe, it, expect } from 'vitest'
import { shuffle } from './shuffle'

describe('shuffle', () => {
  it('non muta l\'array originale', () => {
    const original = [1, 2, 3, 4, 5]
    const frozen = [...original]
    shuffle(original)
    expect(original).toEqual(frozen)
  })

  it('restituisce tutti gli elementi originali', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const result = shuffle(arr)
    expect(result).toHaveLength(arr.length)
    expect([...result].sort((a, b) => a - b)).toEqual([...arr].sort((a, b) => a - b))
  })

  it('restituisce un nuovo array', () => {
    const arr = [1, 2, 3]
    const result = shuffle(arr)
    expect(result).not.toBe(arr)
  })

  it('funziona con array vuoto', () => {
    expect(shuffle([])).toEqual([])
  })

  it('funziona con array da un elemento', () => {
    expect(shuffle([42])).toEqual([42])
  })

  it('produce ordini diversi su N esecuzioni (probabilistico)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8]
    const seen = new Set()
    for (let i = 0; i < 50; i++) seen.add(shuffle(arr).join(','))
    // Con 8 elementi le probabilità che 50 shuffle diano lo stesso ordine sono trascurabili
    expect(seen.size).toBeGreaterThan(1)
  })
})
