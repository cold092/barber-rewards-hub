/**
 * Generate WhatsApp link with pre-filled message
 */
export const DEFAULT_LEAD_MESSAGE =
  'Olá {leadName}! 👋\n\nO {barberName} te indicou para conhecer nossa barbearia! 💈\n\nVocê ganhou uma vantagem especial por ser uma indicação. Vamos agendar seu primeiro corte?';

export const buildLeadMessage = (
  template: string,
  leadName: string,
  barberName: string
): string => {
  return template
    .replace(/{leadName}/g, leadName)
    .replace(/{barberName}/g, barberName);
};

export function generateWhatsAppLink(
  leadName: string,
  leadPhone: string,
  barberName: string,
  template: string = DEFAULT_LEAD_MESSAGE
): string {
  // Clean phone number - remove non-digits
  const cleanPhone = leadPhone.replace(/\D/g, '');
  
  // Add Brazil country code if not present
  const phoneWithCode = cleanPhone.startsWith('55') 
    ? cleanPhone 
    : `55${cleanPhone}`;
  
  // Create the message
  const message = buildLeadMessage(template, leadName, barberName);
  
  // Encode the message for URL
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${phoneWithCode}?text=${encodedMessage}`;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  } else if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  
  return phone;
}

/**
 * Validate phone number (basic validation)
 */
export function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, '');
  return clean.length >= 10 && clean.length <= 11;
}
