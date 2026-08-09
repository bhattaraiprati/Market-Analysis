import { repairMojibake } from './text-encoding.util';

describe('repairMojibake', () => {
  it('repairs UTF-8 punctuation decoded as Latin-1', () => {
    expect(repairMojibake('Iâm using salesâspecific data')).toBe(
      'I’m using sales‑specific data',
    );
  });

  it('leaves valid Unicode text unchanged', () => {
    expect(repairMojibake('Useful analysis — ready ✅')).toBe(
      'Useful analysis — ready ✅',
    );
  });
});
