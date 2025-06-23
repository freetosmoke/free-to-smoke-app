export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  points: number;
  createdAt: string;
  profileImage?: string; // Base64 encoded image string
  marketingConsent?: boolean;
}

export interface Prize {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  isActive: boolean;
  image?: string;
  requiredLevel?: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'promo' | 'offer';
  createdAt: string;
  isActive: boolean;
}

export interface PointTransaction {
  id: string;
  customerId: string;
  points: number;
  type: 'add' | 'redeem';
  description: string;
  timestamp: string;
}

export type UserLevel = 'Bronzo' | 'Argento' | 'Oro' | 'Platino';

export interface LevelConfig {
  name: UserLevel;
  minPoints: number;
  maxPoints: number;
  color: string;
  bgColor: string;
}