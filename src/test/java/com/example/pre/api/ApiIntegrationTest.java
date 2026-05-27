package com.example.pre.api;

import com.example.pre.app.ReKeyShareApplication;
import com.example.pre.app.RuntimeProfile;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApiIntegrationTest {
	private static final HttpClient CLIENT = HttpClient.newHttpClient();
	@Test
	void apiSupportsManagedSharingFlowAndBlocksPackageIdGuessing() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.startDemo(0);
		try {
			String base = "http://localhost:" + server.port();
			String aliceToken = createUser(base, "Alice", "OWNER", "RSA_PRE");
			String bobToken = createUser(base, "Bob", "RECIPIENT", "RSA_PRE");
			String charlieToken = createUser(base, "Charlie", "RECIPIENT", "RSA_PRE");
			String proxyToken = createUser(base, "proxy", "PROXY", "RSA_PRE");

			HttpResponse<String> upload = post(base + "/api/data/upload", aliceToken,
					"plaintext=api-secret&fileName=api.txt");
			assertEquals(201, upload.statusCode());
			String dataId = field(upload.body(), "dataId");

			HttpResponse<String> grant = post(base + "/api/grants", aliceToken,
					"dataId=" + dataId + "&recipientId=Bob&maxAccessCount=5");
			assertEquals(201, grant.statusCode());
			String grantId = field(grant.body(), "grantId");

			HttpResponse<String> data = get(base + "/api/data/" + dataId, aliceToken);
			assertEquals(200, data.statusCode());

			HttpResponse<String> blockedData = get(base + "/api/data/" + dataId, charlieToken);
			assertEquals(403, blockedData.statusCode());

			HttpResponse<String> pkg = post(base + "/api/proxy/re-encrypt", proxyToken, "grantId=" + grantId);
			assertEquals(201, pkg.statusCode());
			String packageId = field(pkg.body(), "packageId");

			HttpResponse<String> bobDownload = get(base + "/api/shared-packages/" + packageId, bobToken);
			assertEquals(200, bobDownload.statusCode());
			assertTrue(bobDownload.body().contains("\"ciphertextStoragePath\""));
			assertTrue(bobDownload.body().contains("\"packageVersion\":\"v2\""));
			assertTrue(bobDownload.body().contains("\"manifestHash\""));
			assertTrue(bobDownload.body().contains("\"manifestFormatVersion\":\"2.0\""));
			assertTrue(bobDownload.body().contains("\"minVerifierVersion\":\"2.0\""));
			assertTrue(bobDownload.body().contains("\"schemeId\":\"RSA_PRE_BASELINE\""));
			assertTrue(bobDownload.body().contains("\"securityLevel\":\"EXPERIMENTAL\""));
			assertTrue(bobDownload.body().contains("\"conversionProofDigest\""));
			assertTrue(!bobDownload.body().contains("api-secret"));

			HttpResponse<String> bobDemoDecrypt = get(base + "/api/demo/shared-packages/" + packageId + "/decrypt",
					bobToken);
			assertEquals(200, bobDemoDecrypt.statusCode());
			assertTrue(bobDemoDecrypt.body().contains("api-secret"));

			HttpResponse<String> charlieDownload = get(base + "/api/shared-packages/" + packageId, charlieToken);
			assertEquals(403, charlieDownload.statusCode());
			HttpResponse<String> missingPackage = get(base + "/api/shared-packages/not-a-package", charlieToken);
			assertEquals(charlieDownload.statusCode(), missingPackage.statusCode());
			assertTrue(charlieDownload.body().contains("ACCESS_DENIED"));
			assertTrue(missingPackage.body().contains("ACCESS_DENIED"));
		} finally {
			server.stop();
		}
	}

	@Test
	void apiRejectsWrongGrantOwnerAndRevokedProxyUse() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.startDemo(0);
		try {
			String base = "http://localhost:" + server.port();
			String aliceToken = createUser(base, "Alice", "OWNER", "RSA_PRE");
			String bobToken = createUser(base, "Bob", "RECIPIENT", "RSA_PRE");
			String proxyToken = createUser(base, "proxy", "PROXY", "RSA_PRE");

			String dataId = field(post(base + "/api/data/upload", aliceToken, "plaintext=private").body(), "dataId");
			HttpResponse<String> wrongOwnerGrant = post(base + "/api/grants", bobToken,
					"dataId=" + dataId + "&recipientId=Bob");
			assertEquals(403, wrongOwnerGrant.statusCode());

			String grantId = field(
					post(base + "/api/grants", aliceToken, "dataId=" + dataId + "&recipientId=Bob").body(), "grantId");
			assertEquals(200, post(base + "/api/grants/" + grantId + "/revoke", aliceToken, "").statusCode());
			HttpResponse<String> revokedProxy = post(base + "/api/proxy/re-encrypt", proxyToken, "grantId=" + grantId);
			assertEquals(403, revokedProxy.statusCode());
			assertTrue(revokedProxy.body().contains("GRANT_REVOKED"));
		} finally {
			server.stop();
		}
	}

	@Test
	void auditAndOpenApiEndpointsExposeManagementSurface() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.startDemo(0);
		try {
			String base = "http://localhost:" + server.port();
			String openApi = get(base + "/openapi.json", "").body();
			assertTrue(openApi.contains("/api/data/upload"));
			assertTrue(openApi.contains("/api/shared-packages/{packageId}"));
			assertTrue(openApi.contains("/api/demo/shared-packages/{packageId}/decrypt"));
			assertTrue(openApi.contains("/api/benchmark/results"));
			assertTrue(openApi.contains("/api/storage/export"));

			String adminToken = createUser(base, "admin", "ADMIN", "RSA_PRE");
			HttpResponse<String> audit = get(base + "/api/audit/verify", adminToken);
			assertEquals(200, audit.statusCode());
			assertTrue(audit.body().contains("\"valid\":true"));
		} finally {
			server.stop();
		}
	}

	@Test
	void apiJsonParserAcceptsCommaAndColonInsideStrings() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.startDemo(0);
		try {
			String base = "http://localhost:" + server.port();
			String aliceToken = createUser(base, "Alice", "OWNER", "RSA_PRE");
			createUser(base, "Bob", "RECIPIENT", "RSA_PRE");
			String dataId = field(post(base + "/api/data/upload", aliceToken,
					"{\"plaintext\":\"json secret\",\"fileName\":\"a:b.txt\"}").body(), "dataId");

			HttpResponse<String> grant = post(base + "/api/grants", aliceToken,
					"{\"dataId\":\"" + dataId + "\",\"recipientId\":\"Bob\",\"purpose\":\"demo, medical, research\"}");
			assertEquals(201, grant.statusCode());
		} finally {
			server.stop();
		}
	}

	@Test
	void apiSupportsEccRecipientShareGrantFlow() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.startDemo(0);
		try {
			String base = "http://localhost:" + server.port();
			String aliceToken = createUser(base, "Alice", "OWNER", "ECC_PRE");
			String bobToken = createUser(base, "Bob", "RECIPIENT", "ECC_PRE");
			String proxyToken = createUser(base, "proxy", "PROXY", "ECC_PRE");

			String dataId = field(post(base + "/api/data/upload", aliceToken,
					"plaintext=ecc-api-secret&fileName=ecc.txt&algorithm=ECC_PRE").body(), "dataId");
			String sessionId = field(
					post(base + "/api/rekey-sessions", aliceToken, "dataId=" + dataId + "&recipientId=Bob").body(),
					"sessionId");
			assertEquals(201, post(base + "/api/rekey-sessions/" + sessionId + "/recipient-share-demo", bobToken, "")
					.statusCode());
			String grantId = field(post(base + "/api/grants/ecc", aliceToken,
					"dataId=" + dataId + "&recipientId=Bob&sessionId=" + sessionId).body(), "grantId");
			String packageId = field(post(base + "/api/proxy/re-encrypt", proxyToken, "grantId=" + grantId).body(),
					"packageId");

			HttpResponse<String> pkg = get(base + "/api/shared-packages/" + packageId, bobToken);
			assertEquals(200, pkg.statusCode());
			assertTrue(pkg.body().contains("grantContextHash"));
			assertEquals(200, get(base + "/api/demo/shared-packages/" + packageId + "/decrypt", bobToken).statusCode());
		} finally {
			server.stop();
		}
	}

	@Test
	void apiRotatesUserKeyWithNewFingerprint() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.startDemo(0);
		try {
			String base = "http://localhost:" + server.port();
			String aliceToken = createUser(base, "Alice", "OWNER", "RSA_PRE");
			HttpResponse<String> rotate = post(base + "/api/users/Alice/keys/rotate", aliceToken, "");
			assertEquals(200, rotate.statusCode());
			assertTrue(rotate.body().contains("\"fingerprint\""));
		} finally {
			server.stop();
		}
	}

	@Test
	void protectedApiRejectsMissingBearerToken() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.startDemo(0);
		try {
			String base = "http://localhost:" + server.port();
			HttpResponse<String> response = post(base + "/api/data/upload", "", "plaintext=no-token");
			assertEquals(401, response.statusCode());
			assertTrue(response.body().contains("UNAUTHENTICATED"));
			assertTrue(response.body().contains("\"traceId\""));
			assertTrue(response.body().contains("\"eventId\""));
		} finally {
			server.stop();
		}
	}

	@Test
	void productionProfileDoesNotExposeDemoPlaintextRoutes() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.start(0);
		try {
			String base = "http://localhost:" + server.port();
			String openApi = get(base + "/openapi.json", "").body();
			assertTrue(!openApi.contains("/api/demo/shared-packages/{packageId}/decrypt"));
			assertTrue(!openApi.contains("/api/data/upload\""));
			assertTrue(!openApi.contains("/api/users/{userId}/keys/rotate"));
			assertTrue(!openApi.contains("/api/proxy/re-encrypt"));
			assertTrue(!openApi.contains("/api/grants\""));
			HttpResponse<String> baselineRegistration = post(base + "/api/users", "",
					"userId=Rejected&role=OWNER&algorithm=RSA_PRE");
			assertEquals(403, baselineRegistration.statusCode());
			assertTrue(baselineRegistration.body().contains("CRYPTO_PROFILE_NOT_ALLOWED"));
			HttpResponse<String> formalRegistration = post(base + "/api/users", "",
					"userId=ProdAlice&role=OWNER&algorithm=SECURE_ENVELOPE");
			assertEquals(201, formalRegistration.statusCode());
			assertTrue(formalRegistration.body().contains("\"algorithmSuite\":\"SECURE_ENVELOPE_V1\""));
			String aliceToken = field(formalRegistration.body(), "token");
			HttpResponse<String> upload = post(base + "/api/data/upload", aliceToken, "plaintext=must-not-work");
			assertEquals(403, upload.statusCode());
			assertTrue(upload.body().contains("DEMO_ONLY_API_DISABLED"));
			HttpResponse<String> rotation = post(base + "/api/users/ProdAlice/keys/rotate", aliceToken, "");
			assertEquals(403, rotation.statusCode());
		} finally {
			server.stop();
		}
	}

	@Test
	void apiV1AliasUsesSameAuthorizationBoundary() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.startDemo(0);
		try {
			String base = "http://localhost:" + server.port();
			String aliceToken = createUser(base, "Alice", "OWNER", "RSA_PRE");
			HttpResponse<String> upload = post(base + "/api/v1/data/upload", aliceToken, "plaintext=v1-secret");
			assertEquals(201, upload.statusCode());
			String dataId = field(upload.body(), "dataId");
			assertEquals(200, get(base + "/api/v1/data/" + dataId, aliceToken).statusCode());
		} finally {
			server.stop();
		}
	}

	@Test
	void enumerationOracleResponsesHaveStableStatusCodeMessageAndSchema() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.startDemo(0);
		try {
			String base = "http://localhost:" + server.port();
			String aliceToken = createUser(base, "OracleAlice", "OWNER", "RSA_PRE");
			String bobToken = createUser(base, "OracleBob", "RECIPIENT", "RSA_PRE");
			String outsiderToken = createUser(base, "OracleOutsider", "RECIPIENT", "RSA_PRE");
			String proxyToken = createUser(base, "proxy", "PROXY", "RSA_PRE");
			String dataId = field(post(base + "/api/data/upload", aliceToken, "plaintext=oracle").body(), "dataId");
			String grantId = field(
					post(base + "/api/grants", aliceToken, "dataId=" + dataId + "&recipientId=OracleBob").body(),
					"grantId");
			String packageId = field(post(base + "/api/proxy/re-encrypt", proxyToken, "grantId=" + grantId).body(),
					"packageId");

			assertIndistinguishable(get(base + "/api/data/" + dataId, outsiderToken),
					get(base + "/api/data/missing-data", outsiderToken));
			assertIndistinguishable(post(base + "/api/grants/" + grantId + "/revoke", outsiderToken, ""),
					post(base + "/api/grants/missing-grant/revoke", outsiderToken, ""));
			assertIndistinguishable(get(base + "/api/shared-packages/" + packageId, outsiderToken),
					get(base + "/api/shared-packages/missing-package", outsiderToken));
		} finally {
			server.stop();
		}
	}

	@Test
	void formalUploadDoesNotAcceptTenantFromRequestBody() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.start(0);
		try {
			String base = "http://localhost:" + server.port();
			String token = field(
					post(base + "/api/users", "", "userId=TenantOwner&role=OWNER&algorithm=SECURE_ENVELOPE").body(),
					"token");
			HttpResponse<String> upload = post(base + "/api/data/upload-encrypted", token,
					"algorithm=SECURE_ENVELOPE&dataId=data-a&tenantId=attacker-tenant"
							+ "&encryptedContent=Y2lwaGVy&contentNonce=bm9uY2Utbm9uY2U="
							+ "&capsuleHeader=aGVhZGVy&wrappedKey=d3JhcHBlZA==&keyNonce=bm9uY2Utbm9uY2U=");
			assertTrue(upload.statusCode() == 201 || upload.statusCode() == 400);
			assertTrue(!upload.body().contains("attacker-tenant"));
		} finally {
			server.stop();
		}
	}

	@Test
	void concurrentDownloadsCannotExceedAccessLimit() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.startDemo(0);
		try {
			String base = "http://localhost:" + server.port();
			String aliceToken = createUser(base, "Alice", "OWNER", "RSA_PRE");
			String bobToken = createUser(base, "Bob", "RECIPIENT", "RSA_PRE");
			String proxyToken = createUser(base, "proxy", "PROXY", "RSA_PRE");
			for (int limit : new int[]{1, 3, 10}) {
				String dataId = field(post(base + "/api/data/upload", aliceToken, "plaintext=counter-" + limit).body(),
						"dataId");
				String grantId = field(post(base + "/api/grants", aliceToken,
						"dataId=" + dataId + "&recipientId=Bob&maxAccessCount=" + limit + "&maxDownloadCount=" + limit)
						.body(), "grantId");
				String packageId = field(post(base + "/api/proxy/re-encrypt", proxyToken, "grantId=" + grantId).body(),
						"packageId");

				var executor = java.util.concurrent.Executors.newFixedThreadPool(100);
				try {
					java.util.List<java.util.concurrent.Future<Integer>> futures = new java.util.ArrayList<>();
					for (int index = 0; index < 100; index++) {
						futures.add(executor
								.submit(() -> get(base + "/api/shared-packages/" + packageId, bobToken).statusCode()));
					}
					int success = 0;
					for (var future : futures) {
						if (future.get() == 200) {
							success++;
						}
					}
					assertEquals(limit, success);
				} finally {
					executor.shutdownNow();
				}
			}
		} finally {
			server.stop();
		}
	}

	@Test
	void malformedAndUnsupportedRequestsReturnClientErrorsWithoutStackLeakage() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.start(0);
		try {
			String base = "http://localhost:" + server.port();
			HttpResponse<String> malformed = postJson(base + "/api/users", "", "{\"userId\":\"unterminated}");
			assertEquals(400, malformed.statusCode());
			assertTrue(!malformed.body().contains("Exception"));

			HttpResponse<String> wrongType = postWithContentType(base + "/api/users", "", "userId=alice", "text/plain");
			assertEquals(400, wrongType.statusCode());
			assertTrue(wrongType.body().contains("INVALID_REQUEST"));
		} finally {
			server.stop();
		}
	}

	@Test
	void replayedIdempotencyKeyDoesNotCreateDuplicateMutation() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.startDemo(0);
		try {
			String base = "http://localhost:" + server.port();
			String aliceToken = createUser(base, "Alice", "OWNER", "RSA_PRE");
			HttpResponse<String> first = postIdempotent(base + "/api/data/upload", aliceToken,
					"plaintext=replay-protected", "upload-key-1");
			HttpResponse<String> replay = postIdempotent(base + "/api/data/upload", aliceToken,
					"plaintext=replay-protected", "upload-key-1");
			assertEquals(201, first.statusCode());
			assertEquals(201, replay.statusCode());
			assertEquals(field(first.body(), "dataId"), field(replay.body(), "dataId"));

			HttpResponse<String> conflict = postIdempotent(base + "/api/data/upload", aliceToken,
					"plaintext=different-operation", "upload-key-1");
			assertEquals(403, conflict.statusCode());
			assertTrue(conflict.body().contains("IDEMPOTENCY_CONFLICT"));
		} finally {
			server.stop();
		}
	}

	@Test
	void managementSurfaceEnforcesKeyOwnershipAndSupportsAuditedExports() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.startDemo(0);
		try {
			String base = "http://localhost:" + server.port();
			assertEquals(200, get(base + "/", "").statusCode());
			String adminToken = createUser(base, "admin", "ADMIN", "RSA_PRE");
			String aliceToken = createUser(base, "Alice", "OWNER", "RSA_PRE");
			String bobToken = createUser(base, "Bob", "RECIPIENT", "RSA_PRE");

			assertEquals(200, post(base + "/api/auth/login", "", "userId=Alice").statusCode());
			assertEquals(200, get(base + "/api/users", adminToken).statusCode());
			assertEquals(403, post(base + "/api/users/Alice/keys", bobToken, "").statusCode());
			assertEquals(201, post(base + "/api/users/Alice/keys", aliceToken, "").statusCode());
			assertEquals(201,
					post(base + "/api/proxy-nodes", adminToken, "proxyId=managed&allowedSchemeIds=RSA_PRE&quota=1")
							.statusCode());
			assertEquals(200, post(base + "/api/proxy-nodes/managed/revoke", adminToken, "").statusCode());

			String dataId = field(post(base + "/api/data/upload", aliceToken, "plaintext=export-proof").body(),
					"dataId");
			assertEquals(200, get(base + "/api/audit/events", adminToken).statusCode());
			assertEquals(200, get(base + "/api/audit/data/" + dataId, adminToken).statusCode());
			assertEquals(200, get(base + "/api/audit/root", adminToken).statusCode());
			assertEquals(200, get(base + "/api/audit/proof", adminToken).statusCode());
			assertEquals(200, get(base + "/api/audit/export", adminToken).statusCode());

			HttpResponse<String> export = post(base + "/api/storage/export", adminToken, "");
			assertEquals(201, export.statusCode());
			String snapshotHash = field(export.body(), "snapshotHash");
			HttpResponse<String> importCheck = post(base + "/api/storage/import-check", adminToken,
					"snapshotHash=" + snapshotHash);
			assertEquals(200, importCheck.statusCode());
			assertTrue(importCheck.body().contains("\"valid\":true"));
			assertEquals(201, post(base + "/api/storage/export-index", adminToken, "").statusCode());
			assertEquals(200, get(base + "/api/storage/status", adminToken).statusCode());
			assertEquals(404, get(base + "/api/no-such-endpoint", adminToken).statusCode());
		} finally {
			server.stop();
		}
	}

	@Test
	void auditorCanVerifyButCannotPerformProxyAdministration() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.startDemo(0);
		try {
			String base = "http://localhost:" + server.port();
			String auditorToken = createUser(base, "auditor", "AUDITOR", "RSA_PRE");
			assertEquals(200, get(base + "/api/audit/verify", auditorToken).statusCode());
			assertEquals(403,
					post(base + "/api/proxy-nodes", auditorToken, "proxyId=forbidden&allowedSchemeIds=RSA_PRE&quota=1")
							.statusCode());
		} finally {
			server.stop();
		}
	}

	@Test
	void secureLocalPersistsAuditAndIdempotencyAcrossHttpRestart() throws Exception {
		String priorUrl = System.getProperty("rekeyshare.local.jdbcUrl");
		String priorSecret = System.getProperty("rekeyshare.local.tokenSecret");
		java.nio.file.Path db = java.nio.file.Path.of("target", "jdbc-test",
				"secure-local-http-" + java.util.UUID.randomUUID());
		System.setProperty("rekeyshare.local.jdbcUrl", "jdbc:h2:file:" + db.toAbsolutePath() + ";DB_CLOSE_DELAY=0");
		System.setProperty("rekeyshare.local.tokenSecret", "secure-local-test-signing-secret");
		String firstBody;
		String adminToken;
		try {
			ReKeyShareApplication.RunningServer first = ReKeyShareApplication.start(0, RuntimeProfile.SECURE_LOCAL);
			try {
				String base = "http://localhost:" + first.port();
				HttpResponse<String> created = postIdempotent(base + "/api/users", "",
						"userId=admin&role=ADMIN&algorithm=SECURE_ENVELOPE", "create-admin");
				assertEquals(201, created.statusCode());
				firstBody = created.body();
				adminToken = field(created.body(), "token");
				assertTrue(get(base + "/api/audit/verify", adminToken).body().contains("\"valid\":true"));
			} finally {
				first.stop();
			}
			ReKeyShareApplication.RunningServer restarted = ReKeyShareApplication.start(0, RuntimeProfile.SECURE_LOCAL);
			try {
				String base = "http://localhost:" + restarted.port();
				HttpResponse<String> replay = postIdempotent(base + "/api/users", "",
						"userId=admin&role=ADMIN&algorithm=SECURE_ENVELOPE", "create-admin");
				assertEquals(201, replay.statusCode());
				assertEquals(firstBody, replay.body());
				assertTrue(get(base + "/api/audit/verify", adminToken).body().contains("\"valid\":true"));
				assertTrue(get(base + "/api/storage/status", adminToken).body()
						.contains("secure-local:h2-audit+replay+idempotency+proxy"));
			} finally {
				restarted.stop();
			}
		} finally {
			if (priorUrl == null)
				System.clearProperty("rekeyshare.local.jdbcUrl");
			else
				System.setProperty("rekeyshare.local.jdbcUrl", priorUrl);
			if (priorSecret == null)
				System.clearProperty("rekeyshare.local.tokenSecret");
			else
				System.setProperty("rekeyshare.local.tokenSecret", priorSecret);
		}
	}

	@Test
	void secureLocalFailsFastWithoutConfiguredTokenSecret() {
		String priorSecret = System.getProperty("rekeyshare.local.tokenSecret");
		try {
			System.clearProperty("rekeyshare.local.tokenSecret");
			assertTrue(org.junit.jupiter.api.Assertions
					.assertThrows(IllegalStateException.class,
							() -> ReKeyShareApplication.start(0, RuntimeProfile.SECURE_LOCAL))
					.getMessage().contains("tokenSecret"));
		} finally {
			if (priorSecret == null)
				System.clearProperty("rekeyshare.local.tokenSecret");
			else
				System.setProperty("rekeyshare.local.tokenSecret", priorSecret);
		}
	}

	private static HttpResponse<String> post(String uri, String actor, String body)
			throws IOException, InterruptedException {
		HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(uri))
				.POST(HttpRequest.BodyPublishers.ofString(body))
				.header("Content-Type", "application/x-www-form-urlencoded");
		if (!actor.isBlank()) {
			builder.header("Authorization", "Bearer " + actor);
		}
		return CLIENT.send(builder.build(), HttpResponse.BodyHandlers.ofString());
	}

	private static HttpResponse<String> get(String uri, String actor) throws IOException, InterruptedException {
		HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(uri)).GET();
		if (!actor.isBlank()) {
			builder.header("Authorization", "Bearer " + actor);
		}
		return CLIENT.send(builder.build(), HttpResponse.BodyHandlers.ofString());
	}

	private static void assertIndistinguishable(HttpResponse<String> existing, HttpResponse<String> missing) {
		assertEquals(existing.statusCode(), missing.statusCode());
		assertEquals(field(existing.body(), "code"), field(missing.body(), "code"));
		assertEquals(field(existing.body(), "message"), field(missing.body(), "message"));
		for (String field : new String[]{"success", "errorCode", "code", "message", "traceId", "requestId", "eventId",
				"timestamp"}) {
			assertEquals(existing.body().contains("\"" + field + "\""), missing.body().contains("\"" + field + "\""));
		}
	}

	private static HttpResponse<String> postJson(String uri, String actor, String body)
			throws IOException, InterruptedException {
		return postWithContentType(uri, actor, body, "application/json");
	}

	private static HttpResponse<String> postWithContentType(String uri, String actor, String body, String contentType)
			throws IOException, InterruptedException {
		HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(uri))
				.POST(HttpRequest.BodyPublishers.ofString(body)).header("Content-Type", contentType);
		if (!actor.isBlank()) {
			builder.header("Authorization", "Bearer " + actor);
		}
		return CLIENT.send(builder.build(), HttpResponse.BodyHandlers.ofString());
	}

	private static HttpResponse<String> postIdempotent(String uri, String actor, String body, String idempotencyKey)
			throws IOException, InterruptedException {
		HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(uri))
				.POST(HttpRequest.BodyPublishers.ofString(body))
				.header("Content-Type", "application/x-www-form-urlencoded").header("Idempotency-Key", idempotencyKey);
		if (!actor.isBlank()) {
			builder.header("Authorization", "Bearer " + actor);
		}
		return CLIENT.send(builder.build(), HttpResponse.BodyHandlers.ofString());
	}

	private static String createUser(String base, String userId, String role, String algorithm) throws Exception {
		HttpResponse<String> response = post(base + "/api/users", "",
				"userId=" + userId + "&role=" + role + "&algorithm=" + algorithm);
		assertEquals(201, response.statusCode());
		return field(response.body(), "token");
	}

	private static String field(String json, String field) {
		java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\"" + field + "\":\"([^\"]+)\"")
				.matcher(json);
		if (!matcher.find()) {
			throw new AssertionError("missing field " + field + " in " + json);
		}
		return matcher.group(1);
	}
}
