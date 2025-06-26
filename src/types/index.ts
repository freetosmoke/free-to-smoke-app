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

export interface NotificationHistory {
  id: string;
  notificationId: string;
  title: string;
  message: string;
  type: 'info' | 'promo' | 'offer';
  recipients: string[]; // Array of customer IDs
  recipientNames: string[]; // Array of customer names for display
  sentAt: string;
  sentBy: string; // Admin identifier
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

export interface AdminCredentials {
  email: string;
  password?: string; // Password hashata, opzionale perché non sempre presente
  createdAt?: string | FirebaseTimestamp;
}

// Interfaccia per il timestamp di Firebase
export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
  toMillis: () => number;
  isEqual: (other: FirebaseTimestamp) => boolean;
  valueOf: () => string;
}

// Tipi di eventi di sicurezza
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  REGISTRATION = 'REGISTRATION',
  REGISTRATION_FAILURE = 'REGISTRATION_FAILURE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_CHANGE_FAILURE = 'PASSWORD_CHANGE_FAILURE',
  PASSWORD_RECOVERY_ATTEMPT = 'PASSWORD_RECOVERY_ATTEMPT',
  ADMIN_ACCESS = 'ADMIN_ACCESS',
  ADMIN_ACCESS_ATTEMPT = 'ADMIN_ACCESS_ATTEMPT',
  ADMIN_ACCOUNT_CREATED = 'ADMIN_ACCOUNT_CREATED',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CUSTOMER_DATA_MODIFIED = 'CUSTOMER_DATA_MODIFIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  CSRF_ATTACK = 'CSRF_ATTACK',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  PROFILE_ACCESS = 'PROFILE_ACCESS',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
  PAGE_ACCESS = 'PAGE_ACCESS',
  SYSTEM_EVENT = 'SYSTEM_EVENT',
  PRIZE_ADDED = 'PRIZE_ADDED',
  PRIZE_UPDATED = 'PRIZE_UPDATED',
  POINTS_ADDED = 'POINTS_ADDED'
}

// Interfaccia per un evento di sicurezza
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  userId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}