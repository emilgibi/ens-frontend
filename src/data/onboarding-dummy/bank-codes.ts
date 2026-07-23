export const BANK_CODES: Record<string, string> = {
  HDFC: 'HDFC Bank',
  ICIC: 'ICICI Bank',
  SBIN: 'State Bank of India',
  PUNB: 'Punjab National Bank',
  UTIB: 'Axis Bank',
  KKBK: 'Kotak Mahindra Bank',
  IDIB: 'Indian Bank',
  BARB: 'Bank of Baroda',
  YESB: 'Yes Bank',
  INDB: 'IndusInd Bank',
};

export function lookupBankName(ifscPrefix: string): string | undefined {
  return BANK_CODES[ifscPrefix.toUpperCase()];
}
