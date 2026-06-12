import { useState, useEffect } from 'react'

let _cache = null
let _promise = null

export function useDomande() {
  const [data, setData] = useState(_cache)

  useEffect(() => {
    if (_cache) { setData(_cache); return }
    if (!_promise) {
      _promise = fetch('/data/domande.json')
        .then(r => r.json())
        .then(d => { _cache = d; return d })
        .catch(() => { _promise = null })
    }
    _promise?.then(setData)
  }, [])

  return data
}

let _cacheOrali = null
let _promiseOrali = null

export function useDomandeOrali() {
  const [data, setData] = useState(_cacheOrali)

  useEffect(() => {
    if (_cacheOrali) { setData(_cacheOrali); return }
    if (!_promiseOrali) {
      _promiseOrali = fetch('/data/banca_orale.json')
        .then(r => r.json())
        .then(d => { _cacheOrali = d; return d })
        .catch(() => { _promiseOrali = null })
    }
    _promiseOrali?.then(setData)
  }, [])

  return data
}
