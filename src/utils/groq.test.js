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

import { generaDomandeExtra, parseJsonArray, parseJsonObject, correggiOrale } from './groq'

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

describe('parseJsonObject', () => {
  it('parsa un oggetto JSON puro', () => {
    const obj = { voto: 20, giudizio: 'Buona' }
    expect(parseJsonObject(JSON.stringify(obj))).toEqual(obj)
  })

  it('estrae oggetto JSON embedded in testo', () => {
    const obj = { voto: 12 }
    const raw = `Ecco la valutazione:\n${JSON.stringify(obj)}\nSpero sia utile!`
    expect(parseJsonObject(raw)).toEqual(obj)
  })

  it('lancia errore se non trova nessun oggetto', () => {
    expect(() => parseJsonObject('nessun oggetto qui')).toThrow('Nessun oggetto JSON trovato')
  })

  it('lancia errore se il JSON è malformato', () => {
    expect(() => parseJsonObject('{"voto": 10')).toThrow()
  })
})

describe('correggiOrale', () => {
  beforeEach(() => mockFetch.mockReset())

  const ESITO_VALIDO = {
    voto: 27,
    giudizio: 'Completa',
    feedback: 'Hai coperto i punti principali.',
    collegamento: 'Si collega alla prevenzione delle infezioni.',
    domanda_approfondimento: 'Quando usi i guanti?',
    sintesi_vocale: 'Ottimo, 27 su 30.'
  }

  const ARGS = {
    domanda: 'Chi è l\'OSS?',
    argomento: 'Ruolo e profilo',
    puntiChiave: ['supporto', 'bisogni primari'],
    erroriComuni: ['confonderlo con l\'infermiere'],
    rispostaModello: 'L\'OSS è una figura di supporto...',
    rispostaData: 'È un operatore di supporto ai bisogni primari'
  }

  it('restituisce un esito normalizzato da JSON valido', async () => {
    mockFetch.mockResolvedValue(groqResponse(JSON.stringify(ESITO_VALIDO)))
    const res = await correggiOrale(ARGS)
    expect(res).toEqual(ESITO_VALIDO)
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it('arrotonda e limita il voto a 0-30 e deriva il giudizio mancante', async () => {
    mockFetch.mockResolvedValue(groqResponse(JSON.stringify({ voto: 35.6, feedback: 'x' })))
    const res = await correggiOrale(ARGS)
    expect(res.voto).toBe(30)
    expect(res.giudizio).toBe('Completa')
    expect(res.sintesi_vocale).toContain('30')
  })

  it('deriva "Da rivedere" per voti sotto la sufficienza', async () => {
    mockFetch.mockResolvedValue(groqResponse(JSON.stringify({ voto: 9 })))
    const res = await correggiOrale(ARGS)
    expect(res.giudizio).toBe('Da rivedere')
  })

  it('riprova con contesto correttivo se il primo parsing fallisce', async () => {
    mockFetch
      .mockResolvedValueOnce(groqResponse('testo non JSON'))
      .mockResolvedValueOnce(groqResponse(JSON.stringify(ESITO_VALIDO)))

    const res = await correggiOrale(ARGS)
    expect(res.voto).toBe(27)
    expect(mockFetch).toHaveBeenCalledTimes(2)

    const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    const roles = secondCallBody.messages.map(m => m.role)
    expect(roles).toEqual(['system', 'user', 'assistant', 'user'])
    expect(secondCallBody.messages.at(-1).content).toContain('JSON valido')
  })

  it('lancia errore esplicito dopo due tentativi falliti', async () => {
    mockFetch.mockResolvedValue(groqResponse('nessun json'))
    await expect(correggiOrale(ARGS)).rejects.toThrow('Non sono riuscito a valutare la risposta, riprova.')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
