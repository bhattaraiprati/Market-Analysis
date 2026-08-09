const MOJIBAKE_PATTERN = /(?:Ã[-¿]|Â[-¿]|â[-¿]{2}|ð[-¿]{3})/g;

/**
 * Repairs UTF-8 text that was accidentally decoded as Windows-1252/Latin-1.
 * The conversion is only accepted when it reduces known mojibake sequences.
 */
export function repairMojibake(value: string): string {
  if (!value || !MOJIBAKE_PATTERN.test(value)) return value;
  MOJIBAKE_PATTERN.lastIndex = 0;

  const repaired = Buffer.from(value, 'latin1').toString('utf8');
  const originalMarkers = (value.match(MOJIBAKE_PATTERN) || []).length;
  MOJIBAKE_PATTERN.lastIndex = 0;
  const repairedMarkers = (repaired.match(MOJIBAKE_PATTERN) || []).length;

  return !repaired.includes('\uFFFD') && repairedMarkers < originalMarkers
    ? repaired
    : value;
}
