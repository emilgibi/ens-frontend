export const GST_STATE_CODES: Record<string, string> = {
  '06': 'Haryana',
  '07': 'Delhi',
  '09': 'Uttar Pradesh',
  '19': 'West Bengal',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '36': 'Telangana',
};

export function lookupGstState(stateCode: string): string | undefined {
  return GST_STATE_CODES[stateCode];
}
