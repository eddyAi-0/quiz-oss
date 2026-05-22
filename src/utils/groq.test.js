import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      })
    }
  }
}))

import { generaDomandeExtra, parseJsonArray } from './groq'

const mockFetch = vi.fn()
global.fetch = mockFetch

function groqResponse(content) {
  return {
    ok: true,
    json: () => Promise.resolve({ choices: [{ message: { content } }] })
  }
}

const DOMANDE_VALIDE = [
  { domanda: 'Cos\'è l\'igiene?', opzioni: ['A', 'B', 'C', 'D'], risposta_corretta: 0, spiegazione: 'Perché...' },
  { domanda: 'Cos\'è l\'anatomia?', opzioni: ['E', 'F', 'G', 'H'], risposta_corretta: 1, spiegazione: 'Perché...' },
  { domanda: 'Cos\'è la cura?', opzioni: ['I', 'L', 'M', 'N'], risposta_corretta: 2, spiegazione: 'Perché...' }
]

describe('parseJsonArray', () => {
  it('parsa un array JSON puro', () => {
    const arr = [{ a: 1 }, { b: 2 }]
    expect(parseJsonArray(JSON.stringify(arr))).toEqual(arr)
  })

  it('estrae array JSON embedded in testo', () => {
    const arr = [{ domanda: 'X', risposta_corretta: 0 }]
    const raw = `Ecco le domande:\n${JSON.stringify(arr)}\nSpero aiutino!`
    expect(parseJsonArray(raw)).toEqual(arr)
  })

  it('lancia errore se non trova nessun array', () => {
    expect(() => parseJsonArray('nessun array qui')).toThrow('Nessun array JSON trovato')
  })

  it('lancia errore se il JSON è malformato', () => {
    expect(() => parseJsonArray('[{"chiave": "valore"')).toThrow()
  })
})

describe('generaDomandeExtra', () => {
  beforeEach(() => mockFetch.mockReset())

  it('parsa un array JSON valido nella risposta', async () => {
    mockFetch.mockResolvedValue(groqResponse(JSON.stringify(DOMANDE_VALIDE)))
    const result = await generaDomandeExtra('Igiene', ['pulizia'])
    expect(result).toEqual(DOMANDE_VALIDE)
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it('estrae JSON embedded nel testo della risposta', async () => {
    const raw = `Ecco le domande:\n${JSON.stringify(DOMANDE_VALIDE)}\n\nSpero aiutino!`
    mockFetch.mockResolvedValue(groqResponse(raw))
    const result = await generaDomandeExtra('Igiene', ['pulizia'])
    expect(result).toEqual(DOMANDE_VALIDE)
  })

  it('riprova con contesto correttivo se il primo parsing fallisce', async () => {
    const badRaw = 'testo non JSON'
    mockFetch
      .mockResolvedValueOnce(groqResponse(badRaw))
      .mockResolvedValueOnce(groqResponse(JSON.stringify(DOMANDE_VALIDE)))

    const result = await generaDomandeExtra('Igiene', ['pulizia'])
    expect(result).toEqual(DOMANDE_VALIDE)
    expect(mockFetch).toHaveBeenCalledTimes(2)

    // La seconda chiamata deve includere la risposta fallita come assistant
    // e il messaggio correttivo come user
    const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    const roles = secondCallBody.messages.map(m => m.role)
    expect(roles).toEqual(['system', 'user', 'assistant', 'user'])
    const lastMsg = secondCallBody.messages.at(-1)
    expect(lastMsg.content).toContain('JSON valido')
    const assistantMsg = secondCallBody.messages.at(-2)
    expect(assistantMsg.content).toBe(badRaw)
  })

  it('lancia errore esplicito dopo due tentativi falliti', async () => {
    mockFetch.mockResolvedValue(groqResponse('risposta senza JSON'))

    await expect(generaDomandeExtra('Igiene', ['pulizia']))
      .rejects
      .toThrow('Non sono riuscito a generare le domande, riprova.')

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('lancia errore esplicito se il JSON è malformato', async () => {
    mockFetch.mockResolvedValue(groqResponse('[{"domanda": "manca la chiusura"'))

    await expect(generaDomandeExtra('Igiene', ['pulizia']))
      .rejects
      .toThrow('Non sono riuscito a generare le domande, riprova.')
  })
})
