import { beforeEach, describe, expect, it } from 'vitest'

import i18n from '@/i18n'

import { formatMoney, ticketCode } from './format'

describe('formato', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('es')
  })

  it('pesos sin decimales cuando son enteros', () => {
    expect(formatMoney('1900000.00')).toMatch(/^\$\s?1\.900\.000$/)
    expect(formatMoney(10.5, 'USD')).toMatch(/10,50/)
  })

  it('código del ticket', () => {
    expect(ticketCode(7)).toBe('TK-000007')
    expect(ticketCode(1234567)).toBe('TK-1234567')
  })
})
