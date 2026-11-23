import { UiImperiumBranch, UiPresence } from 'ic-angular-uikit';

export interface Member {
  pseudo: string;
  role: string;
  branches: UiImperiumBranch[];
  presence: UiPresence;
  avatar?: string;
}

export const MEMBERS: Member[] = [
  { pseudo: 'Aurelius', role: 'Empereur', branches: ['joueurs', 'communicants'], presence: 'online', avatar: 'demo/imperium/sceau.svg' },
  { pseudo: 'Valkyrie', role: 'Officière', branches: ['joueurs', 'cine'], presence: 'busy' },
  { pseudo: 'Byte_Forge', role: 'Parrain', branches: ['developpeurs'], presence: 'away' },
  { pseudo: 'Lumen', role: 'Membre', branches: ['cine', 'communicants', 'developpeurs'], presence: 'offline' },
];
