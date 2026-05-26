export type ApiAlgorithm = "RSA_PRE" | "ECC_PRE";

export type ApiUser = {
  userId: string;
  role: string;
  algorithm: string;
  publicKey: string;
  privateKeyStatus: string;
};

export type ApiFile = {
  dataId: string;
  fileName: string;
  ownerId: string;
  algorithm: string;
  cipherSize: number;
  plaintextSize: number;
  createdAt: string;
  hashPreview: string;
};

export type ApiShared = {
  dataId: string;
  ownerId: string;
  recipientId: string;
  algorithm: string;
  authorizedAt: string;
  status: string;
};

export type ApiAudit = {
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  success: boolean;
  message: string;
};

export type ApiPerformance = {
  algorithm: string;
  stage: string;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
  sizeBytes: number;
};

export type ApiSummary = {
  uploads: number;
  authorizations: number;
  reEncryptions: number;
  decryptions: number;
  users: number;
  sharedPackages: number;
};

export type ConsoleData = {
  users: ApiUser[];
  files: ApiFile[];
  sharedFiles: ApiShared[];
  auditEvents: ApiAudit[];
  summary: ApiSummary;
  performanceRows: ApiPerformance[];
};
