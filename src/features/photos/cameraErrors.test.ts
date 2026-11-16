import { describe, expect, it } from 'vitest'
import { cameraErrorMessage } from './cameraErrors'

describe('cameraErrorMessage', () => {
  it('explains a blocked permission and offers the file picker', () => {
    expect(cameraErrorMessage(new DOMException('no', 'NotAllowedError'))).toMatch(/permission was blocked/)
    expect(cameraErrorMessage(new DOMException('no', 'SecurityError'))).toMatch(/permission was blocked/)
  })

  it('explains a missing or busy camera', () => {
    expect(cameraErrorMessage(new DOMException('no', 'NotFoundError'))).toMatch(/No camera was found/)
    expect(cameraErrorMessage(new DOMException('no', 'NotReadableError'))).toMatch(/busy/)
  })

  it('has a safe message for anything else', () => {
    expect(cameraErrorMessage(new Error('weird'))).toMatch(/could not be opened/)
    expect(cameraErrorMessage(undefined)).toMatch(/could not be opened/)
  })
})
