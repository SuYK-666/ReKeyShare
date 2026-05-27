CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(32) NOT NULL PRIMARY KEY,
  description VARCHAR(256) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  tenant_id VARCHAR(128) NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  role VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS data_objects (
  tenant_id VARCHAR(128) NOT NULL,
  data_id VARCHAR(128) NOT NULL,
  owner_id VARCHAR(128) NOT NULL,
  algorithm VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  content_key_version INT NOT NULL,
  ciphertext_hash VARCHAR(128) NOT NULL,
  storage_path VARCHAR(512) NOT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  PRIMARY KEY (tenant_id, data_id),
  FOREIGN KEY (tenant_id, owner_id) REFERENCES users(tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS grants (
  tenant_id VARCHAR(128) NOT NULL,
  grant_id VARCHAR(128) NOT NULL,
  data_id VARCHAR(128) NOT NULL,
  owner_id VARCHAR(128) NOT NULL,
  recipient_id VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  policy_hash VARCHAR(128) NOT NULL,
  content_key_version INT NOT NULL,
  max_access_count INT NOT NULL,
  max_reencrypt_count INT NOT NULL DEFAULT 1,
  max_download_count INT NOT NULL DEFAULT 1,
  max_decrypt_count INT NOT NULL DEFAULT 1,
  access_count INT NOT NULL,
  reencrypt_count INT NOT NULL,
  download_count INT NOT NULL,
  decrypt_count INT NOT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, grant_id),
  FOREIGN KEY (tenant_id, data_id) REFERENCES data_objects(tenant_id, data_id),
  FOREIGN KEY (tenant_id, owner_id) REFERENCES users(tenant_id, user_id),
  FOREIGN KEY (tenant_id, recipient_id) REFERENCES users(tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS packages (
  tenant_id VARCHAR(128) NOT NULL,
  package_id VARCHAR(128) NOT NULL,
  grant_id VARCHAR(128) NOT NULL,
  data_id VARCHAR(128) NOT NULL,
  recipient_id VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  content_key_version INT NOT NULL,
  conversion_proof_digest VARCHAR(128),
  proof_public_key_id VARCHAR(128),
  created_at TIMESTAMP NOT NULL,
  PRIMARY KEY (tenant_id, package_id),
  FOREIGN KEY (tenant_id, grant_id) REFERENCES grants(tenant_id, grant_id)
);

CREATE TABLE IF NOT EXISTS aes_gcm_nonces (
  tenant_id VARCHAR(128) NOT NULL DEFAULT 'local',
  key_id VARCHAR(128) NOT NULL DEFAULT 'legacy-fingerprint',
  key_fingerprint VARCHAR(128) NOT NULL,
  nonce VARCHAR(64) NOT NULL,
  allocation_status VARCHAR(32) NOT NULL DEFAULT 'COMMITTED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, key_id, nonce),
  UNIQUE (key_fingerprint, nonce)
);

ALTER TABLE grants ADD COLUMN IF NOT EXISTS max_reencrypt_count INT NOT NULL DEFAULT 1;
ALTER TABLE grants ADD COLUMN IF NOT EXISTS max_download_count INT NOT NULL DEFAULT 1;
ALTER TABLE grants ADD COLUMN IF NOT EXISTS max_decrypt_count INT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS key_versions (
  tenant_id VARCHAR(128) NOT NULL,
  key_id VARCHAR(128) NOT NULL,
  owner_id VARCHAR(128) NOT NULL,
  version INT NOT NULL,
  algorithm_suite VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  retired_at TIMESTAMP,
  rotation_reason VARCHAR(256),
  PRIMARY KEY (tenant_id, key_id, version),
  FOREIGN KEY (tenant_id, owner_id) REFERENCES users(tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS proxy_nodes (
  tenant_id VARCHAR(128) NOT NULL,
  proxy_id VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  signing_public_key VARCHAR(512),
  certificate_fingerprint VARCHAR(512) NOT NULL DEFAULT '',
  allowed_tenant_ids VARCHAR(1024) NOT NULL DEFAULT '*',
  allowed_scheme_ids VARCHAR(512) NOT NULL DEFAULT '',
  quota BIGINT NOT NULL,
  usage_count BIGINT NOT NULL,
  suspended_reason VARCHAR(256) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL,
  PRIMARY KEY (tenant_id, proxy_id)
);

ALTER TABLE proxy_nodes ADD COLUMN IF NOT EXISTS certificate_fingerprint VARCHAR(512) NOT NULL DEFAULT '';
ALTER TABLE proxy_nodes ADD COLUMN IF NOT EXISTS allowed_tenant_ids VARCHAR(1024) NOT NULL DEFAULT '*';
ALTER TABLE proxy_nodes ADD COLUMN IF NOT EXISTS allowed_scheme_ids VARCHAR(512) NOT NULL DEFAULT '';
ALTER TABLE proxy_nodes ADD COLUMN IF NOT EXISTS suspended_reason VARCHAR(256) NOT NULL DEFAULT '';
ALTER TABLE proxy_nodes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE proxy_nodes ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS idempotency_records (
  tenant_id VARCHAR(128) NOT NULL,
  actor_id VARCHAR(128) NOT NULL,
  action VARCHAR(128) NOT NULL,
  resource_id VARCHAR(128) NOT NULL,
  idempotency_key VARCHAR(256) NOT NULL,
  body_hash VARCHAR(128) NOT NULL,
  response_digest VARCHAR(128) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  PRIMARY KEY (tenant_id, actor_id, action, resource_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS idempotency_requests (
  scoped_key VARCHAR(768) NOT NULL PRIMARY KEY,
  request_hash VARCHAR(128) NOT NULL,
  response_status INT,
  response_body CLOB,
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS proof_replay_consumptions (
  tenant_id VARCHAR(128) NOT NULL,
  proxy_id VARCHAR(128) NOT NULL,
  key_id VARCHAR(128) NOT NULL,
  key_epoch BIGINT NOT NULL,
  proof_nonce VARCHAR(256) NOT NULL,
  canonical_payload_hash VARCHAR(128) NOT NULL,
  consumed_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  PRIMARY KEY (tenant_id, proxy_id, key_id, key_epoch, proof_nonce, canonical_payload_hash)
);

CREATE TABLE IF NOT EXISTS rewrap_jobs (
  tenant_id VARCHAR(128) NOT NULL,
  job_id VARCHAR(128) NOT NULL,
  data_id VARCHAR(128) NOT NULL,
  from_content_key_version INT NOT NULL,
  to_content_key_version INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  PRIMARY KEY (tenant_id, job_id)
);

CREATE TABLE IF NOT EXISTS token_revocations (
  tenant_id VARCHAR(128) NOT NULL,
  token_id VARCHAR(128) NOT NULL,
  revoked_at TIMESTAMP NOT NULL,
  reason VARCHAR(256),
  PRIMARY KEY (tenant_id, token_id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  sequence BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  event_id VARCHAR(128) NOT NULL UNIQUE,
  timestamp_utc VARCHAR(64) NOT NULL,
  actor VARCHAR(128) NOT NULL,
  actor_role VARCHAR(64) NOT NULL,
  action VARCHAR(128) NOT NULL,
  target_type VARCHAR(128) NOT NULL,
  target_id VARCHAR(256) NOT NULL,
  success BOOLEAN NOT NULL,
  message CLOB NOT NULL,
  request_id VARCHAR(128) NOT NULL,
  trace_id VARCHAR(128) NOT NULL,
  source_ip VARCHAR(128) NOT NULL,
  user_agent VARCHAR(512) NOT NULL,
  error_code VARCHAR(128) NOT NULL,
  failure_reason CLOB NOT NULL,
  algorithm VARCHAR(64) NOT NULL,
  data_id VARCHAR(128) NOT NULL,
  grant_id VARCHAR(128) NOT NULL,
  package_id VARCHAR(128) NOT NULL,
  tenant_id VARCHAR(128) NOT NULL,
  detail_json CLOB NOT NULL,
  previous_hash VARCHAR(128) NOT NULL,
  event_hash VARCHAR(128) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_audit_events_tenant_sequence ON audit_events (tenant_id, sequence);

CREATE TABLE IF NOT EXISTS audit_public_keys (
  key_id VARCHAR(128) PRIMARY KEY,
  algorithm VARCHAR(32) NOT NULL,
  encoded_public_key VARCHAR(512) NOT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP
);
