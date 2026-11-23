export interface Order {
  id: string;
  customer: string;
  city: string;
  date: Date;
  amount: number;
  paid: boolean;
}

const CUSTOMERS = ['Atelier Dupont', 'Boulangerie Martin', 'Café « Le Zinc »', '+33 Services', 'Garage Moreau; Fils', 'Librairie Lefèvre', 'Studio Noé'];
const CITIES = ['Lyon', 'Nantes', 'Lille', 'Bordeaux', 'Strasbourg'];

/** 42 commandes de démonstration (« +33 Services » commence par « + » : il est neutralisé dans le CSV). */
export const ORDERS: Order[] = Array.from({ length: 42 }, (_, i) => ({
  id: `CMD-${String(1201 + i)}`,
  customer: CUSTOMERS[(i * 5) % CUSTOMERS.length],
  city: CITIES[(i * 3) % CITIES.length],
  date: new Date(2026, 9 + Math.floor(i / 21), 1 + ((i * 7) % 28)),
  amount: Math.round((40 + ((i * 7919) % 2600) / 3.7) * 100) / 100,
  paid: i % 4 !== 1,
}));
