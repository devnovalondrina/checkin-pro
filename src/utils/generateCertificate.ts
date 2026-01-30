import { jsPDF } from 'jspdf'
import { formatCPF } from './format'
import { Event } from '../types'

interface Attendee {
  full_name: string
  cpf: string
}

const numbersMap: { [key: number]: string } = {
  0: 'zero',
  1: 'uma',
  2: 'duas',
  3: 'três',
  4: 'quatro',
  5: 'cinco',
  6: 'seis',
  7: 'sete',
  8: 'oito',
  9: 'nove',
  10: 'dez',
  11: 'onze',
  12: 'doze',
  13: 'treze',
  14: 'quatorze',
  15: 'quinze',
  16: 'dezesseis',
  17: 'dezessete',
  18: 'dezoito',
  19: 'dezenove',
  20: 'vinte'
}

const getWorkloadText = (hours: number) => {
  const text = numbersMap[hours] || hours.toString()
  return `${hours} (${text})`
}

interface TextPart {
  text: string
  bold?: boolean
}

const drawRichText = (
  doc: jsPDF, 
  parts: TextPart[], 
  x: number, 
  y: number, 
  maxWidth: number, 
  lineHeight: number
) => {
  let cursorX = x
  let cursorY = y
  
  doc.setFont("helvetica", "normal")


  // Flatten parts into words to handle wrapping
  // We need to keep track of which part a word belongs to to know if it's bold
  const words: { word: string, bold: boolean }[] = []

  parts.forEach(part => {
    // Split by space but preserve meaning
    const partWords = part.text.split(/(\s+)/).filter(w => w.length > 0)
    partWords.forEach(w => {
        if (w.match(/^\s+$/)) {
            // It's a space/separator
             words.push({ word: ' ', bold: part.bold || false })
        } else {
             words.push({ word: w, bold: part.bold || false })
        }
    })
  })

  // Normalize spaces: merge multiple spaces? No, just handle them.
  // Actually, split logic above might be complex. 
  // Simpler approach: Split by space, assume single space between words unless explicit.
  // But parts might not end with space.
  // E.g. "Name" + "," -> "Name,".
  // So we should not split strictly by space if punctuation is involved without space.
  // But usually we wrap at spaces.

  // Let's iterate parts and split by space, but check if we should add space.
  
  // Re-approach:
  // Build a list of "Tokens" where a Token is a printable string (word or punctuation) or a Space.
  
  const tokens: { text: string, bold: boolean, isSpace: boolean }[] = []
  
  parts.forEach(part => {
      // Split by spaces, keeping them?
      // "Hello world" -> ["Hello", " ", "world"]
      const subTokens = part.text.split(/(\s+)/)
      subTokens.forEach(t => {
          if (!t) return
          if (t.match(/^\s+$/)) {
              tokens.push({ text: ' ', bold: part.bold || false, isSpace: true })
          } else {
              tokens.push({ text: t, bold: part.bold || false, isSpace: false })
          }
      })
  })

  tokens.forEach((token) => {
      doc.setFont("helvetica", token.bold ? "bold" : "normal")
      const tokenWidth = doc.getTextWidth(token.text)
      
      if (token.isSpace) {
          // If space is at start of line, ignore
          if (cursorX === x) return
          
          // If space makes it cross line? No, space usually fits or we break before.
          // But if we are at edge, adding space is fine, it just won't be visible or will be.
          // Let's just advance cursor.
          if (cursorX + tokenWidth > x + maxWidth) {
              // Wrap
              cursorX = x
              cursorY += lineHeight
          } else {
              // Draw space (or just move cursor)
              // doc.text(token.text, cursorX, cursorY) // Drawing space does nothing usually
              cursorX += tokenWidth
          }
      } else {
          // It's a word
          if (cursorX + tokenWidth > x + maxWidth && cursorX > x) {
              // Wrap before drawing
              cursorX = x
              cursorY += lineHeight
          }
          
          doc.text(token.text, cursorX, cursorY)
          cursorX += tokenWidth
      }
  })
}

export const drawCertificatePage = async (
  doc: jsPDF, 
  attendee: Attendee, 
  event: Event, 
  certCode: string
) => {
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()

  // 1. Background
  if (event.certificate_template_url) {
    try {
      doc.addImage(event.certificate_template_url, 'PNG', 0, 0, width, height)
    } catch (e) {
      console.error('Failed to load template', e)
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, width, height, 'F')
    }
  } else {
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, width, height, 'F')
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(1)
    doc.rect(5, 5, width - 10, height - 10)
  }

  // 2. Text Content Construction
  const dateStr = new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const workloadStr = getWorkloadText(event.workload || 0)
  
  // "Certificamos que [NOME] , inscrito(a) no CPF nº [CPF] , participou do Encontro Pedagógico com o tema “[TÍTULO DO EVENTO]” , com carga horária de 4 (quatro) horas (CARGA HORÁRIA), realizado no dia 02 de fevereiro de 2026 (DATA)."
  const parts: TextPart[] = [
    { text: 'Certificamos que ' },
    { text: attendee.full_name, bold: true },
    { text: ', inscrito(a) no CPF nº ' },
    { text: formatCPF(attendee.cpf), bold: true },
    { text: ', participou do Encontro Pedagógico com o tema "' },
    { text: event.title, bold: true },
    { text: '", com carga horária de ' },
    { text: workloadStr },
    { text: ' horas, realizado no dia ' },
    { text: dateStr },
    { text: '.' }
  ]

  // 3. Layout Configuration
  const marginLeft = 15
  const marginTop = 70
  const maxWidth = 130
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)

  drawRichText(doc, parts, marginLeft, marginTop, maxWidth, 7) // 7mm line height (~1.5 factor for 14pt)

  // 4. Validation Code (Below QR Code placeholder)
  // QR Code assumed to be at x=marginLeft+10, y=145, size=30
  const bgQrX = marginLeft + 10
  const bgQrY = 145 
  const bgQrSize = 30

  doc.setFont("helvetica", "bold") // Make validation code bold for visibility? Or normal as per request?
  // User didn't specify bold for code, but it's important. I'll stick to normal but distinct.
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  
  const codeY = bgQrY + bgQrSize + 5
  const codeText = `Cód: ${certCode}`
  
  doc.text(codeText, bgQrX + (bgQrSize / 2), codeY, { align: "center" })
}
