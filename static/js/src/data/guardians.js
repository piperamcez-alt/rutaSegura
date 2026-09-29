// Mock data. In a real deployment this would come from an authenticated API
// call (e.g. GET /api/families/:id/guardians) — keeping it isolated here
// means swapping the data source later never touches the UI components.
export const guardians = [
  { id: 'g1', name: 'Sofía Reyes', role: 'Mamá' },
  { id: 'g2', name: 'Ignacio Reyes', role: 'Papá' },
  { id: 'g3', name: 'Elena Muñoz', role: 'Abuela' },
];

export const child = {
  name: 'Martín Reyes',
  grade: '4° Básico',
  route: 'Furgón Los Robles',
  emoji: '🧒',
};

export const notifications = [
  { id: 'n1', tone: 'green', title: 'El furgón salió del colegio', time: 'hace 6 min' },
  { id: 'n2', tone: 'amber', title: 'Llegada estimada actualizada a 8:24 AM', time: 'hace 2 min' },
];
