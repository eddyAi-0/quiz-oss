import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generaDomandeExtra } from './groq'

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

  it('riprova una volta se il primo parsing fallisce, poi ha successo', async () => {
    mockFetch
      .mockResolvedValueOnce(groqResponse('testo non JSON'))
      .mockResolvedValueOnce(groqResponse(JSON.stringify(DOMANDE_VALIDE)))

    const result = await generaDomandeExtra('Igiene', ['pulizia'])
    expect(result).toEqual(DOMANDE_VALIDE)
    expect(mockFetch).toHaveBeenCalledTimes(2)
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
