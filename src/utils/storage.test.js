import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calcStreak, rebuildSectionStats, importProgress, exportProgress, getUrgencyScore } from './storage'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [] }),
          single: vi.fn().mockResolvedValue({ data: null })
        })
      })
    })
  }
}))

const store = {}
const localStorageMock = {
  getItem: vi.fn(key => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = String(val) }),
  removeItem: vi.fn(key => { delete store[key] }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) })
}
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true })

const TODAY = new Date().toISOString().slice(0, 10)
const YESTERDAY = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
const TWO_DAYS_AGO = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

describe('calcStreak', () => {
  it('inizia streak a 1 senza studio precedente', () => {
    const res = calcStreak({ current: 0, lastStudyDate: null })
    expect(res.current).toBe(1)
    expect(res.lastStudyDate).toBe(TODAY)
  })

  it('non modifica streak se già studiato oggi', () => {
    const res = calcStreak({ current: 5, lastStudyDate: TODAY })
    expect(res.current).toBe(5)
    expect(res.lastStudyDate).toBe(TODAY)
  })

  it('incrementa streak il giorno successivo', () => {
    const res = calcStreak({ current: 4, lastStudyDate: YESTERDAY })
    expect(res.current).toBe(5)
    expect(res.lastStudyDate).toBe(TODAY)
  })

  it('azzera streak se gap > 1 giorno', () => {
    const res = calcStreak({ current: 10, lastStudyDate: TWO_DAYS_AGO })
    expect(res.current).toBe(1)
    expect(res.lastStudyDate).toBe(TODAY)
  })
})

describe('rebuildSectionStats', () => {
  it('calcola totale e corrette per sezione', () => {
    const sessions = [
      {
        questions: [
          { sezione: 'Igiene', isCorrect: true },
          { sezione: 'Igiene', isCorrect: false },
          { sezione: 'Anatomia', isCorrect: true }
        ]
      }
    ]
    const stats = rebuildSectionStats(sessions)
    expect(stats['Igiene']).toEqual({ total: 2, correct: 1 })
    expect(stats['Anatomia']).toEqual({ total: 1, correct: 1 })
  })

  it('accumula correttamente su più sessioni', () => {
    const sessions = [
      { questions: [{ sezione: 'A', isCorrect: true }] },
      { questions: [{ sezione: 'A', isCorrect: false }] }
    ]
    const stats = rebuildSectionStats(sessions)
    expect(stats['A']).toEqual({ total: 2, correct: 1 })
  })

  it('salta sessioni senza array questions', () => {
    const stats = rebuildSectionStats([{ mode: 'pratica' }])
    expect(Object.keys(stats)).toHaveLength(0)
  })

  it('restituisce oggetto vuoto per array di sessioni vuoto', () => {
    expect(rebuildSectionStats([])).toEqual({})
  })
})

describe('importProgress', () => {
  beforeEach(() => localStorageMock.clear())

  it('ritorna true su JSON valido con chiavi richieste', () => {
    const ok = importProgress(JSON.stringify({ sessions: [], sectionStats: {} }))
    expect(ok).toBe(true)
  })

  it('ritorna false su JSON non valido', () => {
    expect(importProgress('non è json')).toBe(false)
  })

  it('ritorna false se mancano sessions o sectionStats', () => {
    expect(importProgress(JSON.stringify({ sessions: [] }))).toBe(false)
    expect(importProgress(JSON.stringify({ sectionStats: {} }))).toBe(false)
  })

  it('persiste i dati su localStorage', () => {
    const payload = { sessions: [{ id: 1 }], sectionStats: { A: { total: 1, correct: 1 } } }
    importProgress(JSON.stringify(payload))
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })
})

describe('getUrgencyScore', () => {
  it('errore recente singolo: count=1, oggi → score=40', () => {
    const entry = { count: 1, recovered: false, lastWrong: TODAY, answers: [] }
    // 10*1 + 0 + 30/(0+1) = 40
    expect(getUrgencyScore(entry)).toBe(40)
  })

  it('errore vecchio (30 giorni): bonus quasi nullo → score < 11', () => {
    const entry = { count: 1, recovered: false, lastWrong: THIRTY_DAYS_AGO, answers: [] }
    // 10 + 0 + 30/31 ≈ 10.968
    const score = getUrgencyScore(entry)
    expect(score).toBeGreaterThan(10)
    expect(score).toBeLessThan(11)
  })

  it('errore vecchio ha score minore di errore recente a parità di count', () => {
    const recent = { count: 1, recovered: false, lastWrong: TODAY, answers: [] }
    const old = { count: 1, recovered: false, lastWrong: THIRTY_DAYS_AGO, answers: [] }
    expect(getUrgencyScore(recent)).toBeGreaterThan(getUrgencyScore(old))
  })

  it('errori multipli: count=3, oggi → score=60', () => {
    const entry = { count: 3, recovered: false, lastWrong: TODAY, answers: [] }
    // 10*3 + 0 + 30/1 = 60
    expect(getUrgencyScore(entry)).toBe(60)
  })

  it('domanda recuperata: sottrae 5 dal punteggio', () => {
    const notRecovered = { count: 2, recovered: false, lastWrong: TODAY, answers: [] }
    const recovered = { count: 2, recovered: true, lastWrong: TODAY, answers: [] }
    // not recovered: 20 + 0 + 30 = 50  |  recovered: 20 - 5 + 30 = 45
    expect(getUrgencyScore(notRecovered)).toBe(50)
    expect(getUrgencyScore(recovered)).toBe(45)
    expect(getUrgencyScore(notRecovered) - getUrgencyScore(recovered)).toBe(5)
  })

  it('lastWrong null trattato come giorno 0 (bonus massimo)', () => {
    const entry = { count: 1, recovered: false, lastWrong: null, answers: [] }
    expect(getUrgencyScore(entry)).toBe(40)
  })

  it('avgResponseTime aggiunge bonus proporzionale (non cappato)', () => {
    const entry = { count: 1, recovered: false, lastWrong: TODAY, answers: [], avgResponseTime: 30 }
    // 10 + 0 + 30 + min(30,60)*0.5 = 40 + 15 = 55
    expect(getUrgencyScore(entry)).toBe(55)
  })

  it('avgResponseTime cappato a 60s per evitare outlier', () => {
    const entry = { count: 1, recovered: false, lastWrong: TODAY, answers: [], avgResponseTime: 120 }
    // 10 + 0 + 30 + min(120,60)*0.5 = 40 + 30 = 70
    expect(getUrgencyScore(entry)).toBe(70)
  })
})

describe('exportProgress', () => {
  it('invoca click sul link di download', () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock')
    global.URL.revokeObjectURL = vi.fn()

    const clickMock = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValueOnce({
      href: '',
      download: '',
      click: clickMock
    })

    exportProgress()
    expect(clickMock).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})
