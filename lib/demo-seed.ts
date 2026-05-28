import type {
  ApiAudit,
  ApiFile,
  ApiPerformance,
  ApiShared,
  ApiSummary,
  ApiUser,
} from "@/lib/api-types";

export const demoSampleContent = `Confidential course project document.
Proxy re-encryption allows a semi-trusted proxy to transform encrypted key capsules without seeing plaintext.`;

export const demoPerformanceRows: ApiPerformance[] = [
  { algorithm: "RSA baseline", stage: "keygen", avgMs: 0.6831, p50Ms: 0.6806, p95Ms: 0.771, minMs: 0.5997, maxMs: 0.771, sizeBytes: 0 },
  { algorithm: "RSA baseline", stage: "encapsulate", avgMs: 0.5516, p50Ms: 0.5392, p95Ms: 0.6118, minMs: 0.5133, maxMs: 0.6118, sizeBytes: 304 },
  { algorithm: "RSA baseline", stage: "rekey", avgMs: 0.002, p50Ms: 0.0012, p95Ms: 0.0089, minMs: 0.0012, maxMs: 0.0089, sizeBytes: 0 },
  { algorithm: "RSA baseline", stage: "reencrypt", avgMs: 1.7082, p50Ms: 1.6888, p95Ms: 1.8141, minMs: 1.6802, maxMs: 1.8141, sizeBytes: 304 },
  { algorithm: "RSA baseline", stage: "decapsulate", avgMs: 1.7837, p50Ms: 1.742, p95Ms: 2.0123, minMs: 1.717, maxMs: 2.0123, sizeBytes: 32 },
  { algorithm: "ECC baseline", stage: "keygen", avgMs: 2.5649, p50Ms: 2.5715, p95Ms: 2.6796, minMs: 2.4193, maxMs: 2.6796, sizeBytes: 0 },
  { algorithm: "ECC baseline", stage: "encapsulate", avgMs: 5.2895, p50Ms: 5.2199, p95Ms: 6.5697, minMs: 4.8839, maxMs: 6.5697, sizeBytes: 113 },
  { algorithm: "ECC baseline", stage: "rekey", avgMs: 0.0096, p50Ms: 0.0076, p95Ms: 0.0185, minMs: 0.0068, maxMs: 0.0185, sizeBytes: 0 },
  { algorithm: "ECC baseline", stage: "reencrypt", avgMs: 2.4783, p50Ms: 2.4533, p95Ms: 2.6254, minMs: 2.3493, maxMs: 2.6254, sizeBytes: 113 },
  { algorithm: "ECC baseline", stage: "decapsulate", avgMs: 2.6927, p50Ms: 2.6445, p95Ms: 3.0061, minMs: 2.4763, maxMs: 3.0061, sizeBytes: 32 },
];

function demoUsers(algorithm: "RSA_PRE" | "ECC_PRE"): ApiUser[] {
  const keyPrefix = algorithm === "RSA_PRE" ? "n=abc123" : "x=def456";
  return [
    { userId: "Alice", role: "数据拥有者", algorithm, publicKey: `${keyPrefix}, ...`, privateKeyStatus: "本地保存" },
    { userId: "Bob", role: "被授权用户", algorithm, publicKey: `${keyPrefix}, ...`, privateKeyStatus: "本地保存" },
    { userId: "Charlie", role: "未授权用户", algorithm, publicKey: `${keyPrefix}, ...`, privateKeyStatus: "本地保存" },
  ];
}

function demoFiles(algorithm: "RSA_PRE" | "ECC_PRE"): ApiFile[] {
  const dataId = algorithm === "RSA_PRE" ? "cd8f84ef-779b-4102-9887-d4024294f0a0" : "1ef76a6a-cd77-4481-894f-6e962e702e8b";
  return [
    {
      dataId,
      fileName: "sample-data.txt",
      ownerId: "Alice",
      algorithm,
      cipherSize: algorithm === "RSA_PRE" ? 304 : 113,
      plaintextSize: demoSampleContent.length,
      createdAt: "2026-05-18T16:15:54.741968Z",
      hashPreview: "a1b2c3d4e5f6g7h8...",
    },
  ];
}

function demoShared(algorithm: "RSA_PRE" | "ECC_PRE"): ApiShared[] {
  const dataId = algorithm === "RSA_PRE" ? "cd8f84ef-779b-4102-9887-d4024294f0a0" : "1ef76a6a-cd77-4481-894f-6e962e702e8b";
  return [
    {
      dataId,
      ownerId: "Alice",
      recipientId: "Bob",
      algorithm,
      authorizedAt: "2026-05-18T16:15:54.744142Z",
      status: "可解密",
    },
  ];
}

function demoAudit(algorithm: "RSA_PRE" | "ECC_PRE"): ApiAudit[] {
  const dataId = algorithm === "RSA_PRE" ? "cd8f84ef-779b-4102-9887-d4024294f0a0" : "1ef76a6a-cd77-4481-894f-6e962e702e8b";
  const base = algorithm === "RSA_PRE" ? "2026-05-18T16:15:54" : "2026-05-18T16:15:54.7";
  return [
    { timestamp: `${base}.720796Z`, actor: "Alice", action: "KEYGEN", target: "Alice", success: true, message: "user key generated" },
    { timestamp: `${base}.723109Z`, actor: "Bob", action: "KEYGEN", target: "Bob", success: true, message: "user key generated" },
    { timestamp: `${base}.724614Z`, actor: "Charlie", action: "KEYGEN", target: "Charlie", success: true, message: "user key generated" },
    { timestamp: `${base}.741968Z`, actor: "Alice", action: "UPLOAD_ENCRYPTED", target: dataId, success: true, message: "sample-data.txt uploaded" },
    { timestamp: `${base}.744142Z`, actor: "Alice", action: "AUTHORIZE", target: "Bob", success: true, message: "authorization granted" },
    { timestamp: `${base}.745908Z`, actor: "proxy", action: "RE_ENCRYPT", target: dataId, success: true, message: "re-encryption completed" },
    { timestamp: `${base}.748248Z`, actor: "Bob", action: "DECRYPT_REENCRYPTED", target: dataId, success: true, message: "decryption succeeded" },
  ];
}

export function getDemoConsoleData(algorithm: "RSA_PRE" | "ECC_PRE") {
  return {
    users: demoUsers(algorithm),
    files: demoFiles(algorithm),
    sharedFiles: demoShared(algorithm),
    auditEvents: demoAudit(algorithm),
    summary: {
      uploads: 1,
      authorizations: 1,
      reEncryptions: 1,
      decryptions: 1,
      users: 3,
      sharedPackages: 1,
    } satisfies ApiSummary,
    performanceRows: demoPerformanceRows,
  };
}
