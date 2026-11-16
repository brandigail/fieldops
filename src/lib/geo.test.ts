import { afterEach, describe, expect, it, vi } from 'vitest'
import { failureFromCode, readPosition } from './geo'

function stubGeolocation(impl: Geolocation | undefined) {
  vi.stubGlobal('navigator', { geolocation: impl })
}

afterEach(() => vi.unstubAllGlobals())

describe('failureFromCode', () => {
  it('maps the browser error codes', () => {
    expect(failureFromCode(1)).toBe('denied')
    expect(failureFromCode(2)).toBe('unavailable')
    expect(failureFromCode(3)).toBe('timeout')
    expect(failureFromCode(99)).toBe('unavailable')
  })
})

describe('readPosition', () => {
  it('returns the fix when the browser gives one', async () => {
    stubGeolocation({
      getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: -26.2, longitude: 28.04, accuracy: 9 } } as GeolocationPosition),
    } as Geolocation)
    expect(await readPosition()).toEqual({ ok: true, fix: { lat: -26.2, lng: 28.04, accuracyM: 9 } })
  })

  it('reports a denied permission instead of throwing', async () => {
    stubGeolocation({
      getCurrentPosition: (_ok: PositionCallback, fail?: PositionErrorCallback | null) => fail?.({ code: 1 } as GeolocationPositionError),
    } as Geolocation)
    expect(await readPosition()).toEqual({ ok: false, reason: 'denied' })
  })

  it('treats a non-numeric reading as unavailable', async () => {
    stubGeolocation({
      getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: Number.NaN, longitude: 1, accuracy: 1 } } as GeolocationPosition),
    } as Geolocation)
    expect(await readPosition()).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('keeps a fix with no usable accuracy', async () => {
    stubGeolocation({
      getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 1, longitude: 2, accuracy: Number.NaN } } as GeolocationPosition),
    } as Geolocation)
    expect(await readPosition()).toEqual({ ok: true, fix: { lat: 1, lng: 2, accuracyM: null } })
  })

  it('says unsupported when there is no geolocation at all', async () => {
    stubGeolocation(undefined)
    expect(await readPosition()).toEqual({ ok: false, reason: 'unsupported' })
    stubGeolocation({} as Geolocation)
    expect(await readPosition()).toEqual({ ok: false, reason: 'unsupported' })
  })
})
