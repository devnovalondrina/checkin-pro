import { describe, it, expect } from 'vitest'
import { formatCPF, cleanCPF, formatPhone } from './format'

describe('Format Utils', () => {
  describe('formatCPF', () => {
    it('should format a valid 11-digit CPF', () => {
      expect(formatCPF('12345678901')).toBe('123.456.789-01')
    })

    it('should handle partial inputs', () => {
      expect(formatCPF('123456')).toBe('123.456')
    })

    it('should re-format already formatted CPF', () => {
      expect(formatCPF('123.456.789-01')).toBe('123.456.789-01')
    })
    
    it('should limit to 11 digits', () => {
        expect(formatCPF('12345678901234')).toBe('123.456.789-01')
    })
  })

  describe('cleanCPF', () => {
    it('should remove all non-digit characters', () => {
      expect(cleanCPF('123.456.789-01')).toBe('12345678901')
      expect(cleanCPF('123abc456')).toBe('123456')
    })
  })

  describe('formatPhone', () => {
    it('should format phone number', () => {
      expect(formatPhone('11987654321')).toBe('(11) 98765-4321')
    })
    
    it('should handle partial inputs', () => {
        expect(formatPhone('11')).toBe('11') 
        expect(formatPhone('119')).toBe('(11) 9')
    })
  })
})
