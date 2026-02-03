export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  SUPPORT = 'SUPPORT',
}

export enum RelatedEntityType {
  RFQ = 'RFQ',
  BOQ = 'BOQ',
  GENERAL = 'GENERAL',
}

export enum ParticipantRole {
  OWNER = 'OWNER',
  PARTICIPANT = 'PARTICIPANT',
  ADMIN = 'ADMIN',
}

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
}

export enum BroadcastTarget {
  ALL = 'ALL',
  CUSTOMERS = 'CUSTOMERS',
  SUPPLIERS = 'SUPPLIERS',
  SPECIFIC = 'SPECIFIC',
}

export enum BroadcastPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum ResponseRating {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  ACCEPTABLE = 'ACCEPTABLE',
  POOR = 'POOR',
  CRITICAL = 'CRITICAL',
}
