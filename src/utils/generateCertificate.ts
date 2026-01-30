import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
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
      // Assuming A4 Landscape
      doc.addImage(event.certificate_template_url, 'PNG', 0, 0, width, height)
    } catch (e) {
      console.error('Failed to load template', e)
      // Fallback to white if fail
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, width, height, 'F')
    }
  } else {
    // If no template, use a clean white background (or could add default styling)
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, width, height, 'F')
    
    // Add minimal default styling if no template is provided
    // but the user's main request is about the TEXT content.
    // We'll add a simple border just in case.
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(1)
    doc.rect(5, 5, width - 10, height - 10)
  }

  // 2. Text Content Construction
  // "Certificamos que [NOME] , inscrito(a) no CPF nº [CPF] , participou do Encontro Pedagógico com o tema “[TÍTULO DO EVENTO]” , com carga horária de 4 (quatro) horas (CARGA HORÁRIA), realizado no dia 02 de fevereiro de 2026 (DATA)."
  
  const dateStr = new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const workloadStr = getWorkloadText(event.workload || 0)
  
  const text = `Certificamos que ${attendee.full_name}, inscrito(a) no CPF nº ${formatCPF(attendee.cpf)}, participou do Encontro Pedagógico com o tema "${event.title}", com carga horária de ${workloadStr} horas, realizado no dia ${dateStr}.`

  // 3. Layout Configuration
  // We assume a left-column layout based on user's implied template
  // Area: x=15mm, y=70mm, width=130mm (approx 45% of width)
  
  const marginLeft = 15
  const marginTop = 70
  const maxWidth = 130
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0) // Black text

  // Use splitTextToSize to wrap text
  // Justify alignment is tricky in jsPDF. 
  // 'align: justify' is supported in text() with maxWidth in recent versions.
  try {
      doc.text(text, marginLeft, marginTop, { 
          maxWidth: maxWidth, 
          align: "justify",
          lineHeightFactor: 1.5
      })
  } catch (e) {
      // Fallback for older jsPDF versions if needed
      const lines = doc.splitTextToSize(text, maxWidth)
      doc.text(lines, marginLeft, marginTop)
  }

  // 4. QR Code & Validation Code
  // "EM BAIXO DEVE COLOCAR O CODIGO DE VALIDAÇÃO DO CERTIFICADO ABAIXO DO QR CODE"
  // Position: Bottom Left area
  
  const qrSize = 30
  const qrX = marginLeft + 10 // Indent slightly
  const qrY = 145 

  try {
    const validationUrl = `${window.location.origin}/validate?code=${certCode}`
    const qrDataUrl = await QRCode.toDataURL(validationUrl, { margin: 1 })
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
  } catch (err) {
    console.error('QR Gen Error', err)
  }

  // Validation Code
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  
  const codeY = qrY + qrSize + 5
  // Center text relative to QR Code
  const codeText = `Cód: ${certCode}`
  const codeTextWidth = doc.getTextWidth(codeText)
  const codeX = qrX + (qrSize / 2) - (codeTextWidth / 2) + (codeTextWidth/2) // actually align center
  
  doc.text(codeText, qrX + (qrSize / 2), codeY, { align: "center" })
  
  // Optional: Validation URL text
  // doc.text(`${window.location.origin}/validate`, qrX + (qrSize / 2), codeY + 4, { align: "center" })
}
