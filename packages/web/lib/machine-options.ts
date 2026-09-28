/**
 * Shared option lists for the machine forms — the "Add Machine" page and the
 * edit form on the machine detail page. One source of truth so both forms
 * offer identical choices and stay in sync.
 */

export const METER_TYPES = ['hours', 'km', 'cycles', 'metres', 'tonnes', 'trips'];

export const MACHINE_TYPES = [
  { value: 'excavator', label: 'Excavator' },
  { value: 'dump_truck', label: 'Dumper' },
  { value: 'dozer', label: 'Dozer' },
  { value: 'wheel_loader', label: 'Wheel Loader' },
  { value: 'backhoe', label: 'Backhoe' },
  { value: 'crane', label: 'Crane' },
  { value: 'bulldozer', label: 'Bulldozer' },
  { value: 'grader', label: 'Grader' },
  { value: 'compactor', label: 'Compactor' },
  { value: 'roller', label: 'Roller' },
  { value: 'telehandler', label: 'Telehandler' },
  { value: 'forklift', label: 'Forklift' },
  { value: 'motor_grader', label: 'Motor Grader' },
  { value: 'motor_scraper', label: 'Motor Scraper' },
  { value: 'pipelayer', label: 'Pipelayer' },
  { value: 'other', label: 'Other' },
];

export const MAKES = [
  { value: 'Caterpillar', label: 'Caterpillar' },
  { value: 'Komatsu', label: 'Komatsu' },
  { value: 'Volvo', label: 'Volvo' },
  { value: 'Hitachi', label: 'Hitachi' },
  { value: 'Liebherr', label: 'Liebherr' },
  { value: 'John Deere', label: 'John Deere' },
  { value: 'Case', label: 'Case' },
  { value: 'JCB', label: 'JCB' },
  { value: 'XCMG', label: 'XCMG' },
  { value: 'Sany', label: 'Sany' },
  { value: 'Hyundai', label: 'Hyundai' },
  { value: 'Doosan', label: 'Doosan' },
  { value: 'Kobelco', label: 'Kobelco' },
  { value: 'Terex', label: 'Terex' },
  { value: 'Other', label: 'Other' },
];

/** Plain values, for a <select> (the edit form). */
export const MAKE_VALUES = MAKES.map((m) => m.value);

export const MODELS: Record<string, string[]> = {
  Caterpillar: ['320', '320F', '330', 'D6', 'D8', 'D10', '966', '980', '777', '785'],
  Komatsu: ['PC200', 'PC300', 'PC400', 'PC200-8', 'D65', 'D85', 'WA320', 'WA380', 'HD325'],
  Volvo: ['L120', 'L150', 'EC200', 'EC300', 'EC480', 'A25G', 'A30G', 'A40G'],
  Hitachi: ['ZX200', 'ZX300', 'ZX470', 'ZAXIS 200'],
  Liebherr: ['R 920', 'R 930', 'R 944', 'PR 734', 'T 264'],
  'John Deere': ['310', '410', '544', '644', '844'],
  Case: ['CX200', 'CX300', '2050M'],
  JCB: ['3CX', '4CX', 'JS200'],
  XCMG: ['XC200', 'XE200', 'GR215'],
  Sany: ['SY200', 'SY300', 'SY500'],
  Hyundai: ['HX200', 'HX300', 'HL760'],
  Doosan: ['DX200', 'DX300', 'DL200'],
  Kobelco: ['SK200', 'SK300', 'SK460'],
  Terex: ['TR100', 'TA300'],
};

/**
 * Model years for the Year dropdown: newest first, back to 1970 — the same
 * floor the old numeric input enforced via min="1970".
 */
export const YEARS: string[] = ((): string[] => {
  const newest = new Date().getFullYear();
  return Array.from({ length: newest - 1970 + 1 }, (_, i) => String(newest - i));
})();

/** Models available for a make. Empty for a blank or "Other" make. */
export function modelsForMake(make: string): string[] {
  if (!make || make === 'Other') return [];
  return MODELS[make] ?? [];
}

/**
 * Keeps a stored value selectable when it is not in the canonical list —
 * e.g. a make/model typed before these fields became dropdowns. Without this
 * the select would silently render as blank and the value would be lost on save.
 */
export function withCurrent(values: string[], current: string): string[] {
  if (!current) return values;
  return values.includes(current) ? values : [...values, current];
}
