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

interface Token {
  text: string
  bold: boolean
  isSpace: boolean
  width: number
}

const drawRichText = (
  doc: jsPDF, 
  parts: TextPart[], 
  x: number, 
  y: number, 
  maxWidth: number, 
  lineHeight: number
) => {
  let cursorY = y
  
  doc.setFont("helvetica", "normal")

  // 1. Tokenize and measure
  const tokens: Token[] = []
  
  parts.forEach(part => {
    // Split by spaces, keeping them
    const subTokens = part.text.split(/(\s+)/)
    subTokens.forEach(t => {
      if (!t) return
      const isSpace = !!t.match(/^\s+$/)
      
      // Measure width
      doc.setFont("helvetica", part.bold ? "bold" : "normal")
      const width = doc.getTextWidth(t)

      tokens.push({
        text: t,
        bold: part.bold || false,
        isSpace,
        width
      })
    })
  })

  // 2. Line breaking and Justification
  let currentLine: Token[] = []
  let currentLineWidth = 0

  const renderLine = (lineTokens: Token[], justify: boolean) => {
    if (lineTokens.length === 0) return

    // Trim trailing spaces for width calculation
    let visibleTokens = [...lineTokens]
    while (visibleTokens.length > 0 && visibleTokens[visibleTokens.length - 1].isSpace) {
      visibleTokens.pop()
    }
    if (visibleTokens.length === 0) return

    // Calculate gap
    const visibleWidth = visibleTokens.reduce((sum, t) => sum + t.width, 0)
    const spaceTokensCount = visibleTokens.filter(t => t.isSpace).length
    
    let extraSpace = 0
    if (justify && spaceTokensCount > 0) {
       const available = maxWidth - visibleWidth
       if (available > 0) {
           extraSpace = available / spaceTokensCount
       }
    }

    let lineX = x
    visibleTokens.forEach(t => {
      doc.setFont("helvetica", t.bold ? "bold" : "normal")
      if (t.isSpace) {
        // Draw nothing but advance cursor
        lineX += t.width + extraSpace
      } else {
        doc.text(t.text, lineX, cursorY)
        lineX += t.width
      }
    })

    cursorY += lineHeight
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    
    // Check overflow
    if (currentLineWidth + token.width > maxWidth && currentLine.length > 0) {
      // If token is space and we are at edge, just ignore/swallow it if it overflows?
      // Or if it fits, we add it. 
      // Usually spaces at end of line are dropped.
      
      if (token.isSpace) {
        // It's a space that overflows or just ends the line.
        // We can just ignore it for the current line and NOT start next line with it.
        // But we should render the current line now.
        renderLine(currentLine, true)
        currentLine = []
        currentLineWidth = 0
        continue // Skip adding this space to next line
      } else {
        // Word overflows. Render current line justified.
        renderLine(currentLine, true)
        currentLine = [token]
        currentLineWidth = token.width
      }
    } else {
      // Fits
      currentLine.push(token)
      currentLineWidth += token.width
    }
  }

  // Render last line (left aligned, no justify)
  if (currentLine.length > 0) {
    renderLine(currentLine, false)
  }
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
  // Reduced width as requested ("menos largo")
  const maxWidth = 110 
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)

  drawRichText(doc, parts, marginLeft, marginTop, maxWidth, 7) // 7mm line height

  // 4. Validation Code (Below QR Code placeholder)
  const bgQrX = marginLeft + 10
  const bgQrY = 145 
  const bgQrSize = 30

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  
  const codeY = bgQrY + bgQrSize + 5
  const codeText = `Cód: ${certCode}`
  
  doc.text(codeText, bgQrX + (bgQrSize / 2), codeY, { align: "center" })
}
