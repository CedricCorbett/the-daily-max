// Fictional crews that plant in scroll order. Each has a state (by 2-letter
// USPS code → we map to FIPS inside TheCrew), a name, and a mean %PR.
export const CREWS = [
  { state: 'TX', name: 'LONE · STAR · LIFT', pr: 91 },
  { state: 'CA', name: 'PACIFIC · STANDARD', pr: 87 },
  { state: 'NY', name: 'IRON · BOROUGH', pr: 94 },
  { state: 'FL', name: 'SALT · LINE · CREW', pr: 82 },
  { state: 'IL', name: 'LAKE · EFFECT', pr: 89 },
  { state: 'CO', name: 'THIN · AIR', pr: 96 },
  { state: 'WA', name: 'EVERGREEN · SIX', pr: 85 },
  { state: 'GA', name: 'CLAY · ROAD', pr: 88 },
  { state: 'MA', name: 'NOR · EASTERS', pr: 90 },
  { state: 'AZ', name: 'DRY · HEAT', pr: 84 },
  { state: 'MI', name: 'GREAT · LAKES · GRIP', pr: 86 },
  { state: 'OR', name: 'HIGH · DESERT', pr: 92 },
];

// USPS → FIPS id (matches us-atlas state feature ids)
export const STATE_FIPS = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09',
  DE: '10', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18',
  IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24', MA: '25',
  MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31', NV: '32',
  NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38', OH: '39',
  OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46', TN: '47',
  TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54', WI: '55',
  WY: '56', DC: '11',
};
