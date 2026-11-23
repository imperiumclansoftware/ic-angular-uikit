export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Éditeur' | 'Lecteur';
  active: boolean;
  projects: number;
}

export const USERS: User[] = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'Admin', active: true, projects: 12 },
  { id: 2, name: 'Alan Turing', email: 'alan@example.com', role: 'Éditeur', active: true, projects: 7 },
  { id: 3, name: 'Grace Hopper', email: 'grace@example.com', role: 'Éditeur', active: false, projects: 23 },
  { id: 4, name: 'Linus Torvalds', email: 'linus@example.com', role: 'Lecteur', active: true, projects: 3 },
  { id: 5, name: 'Margaret Hamilton', email: 'margaret@example.com', role: 'Admin', active: true, projects: 18 },
];
