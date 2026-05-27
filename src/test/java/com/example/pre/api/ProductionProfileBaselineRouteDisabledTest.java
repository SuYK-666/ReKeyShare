package com.example.pre.api;

import com.example.pre.app.ReKeyShareApplication;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class ProductionProfileBaselineRouteDisabledTest {
	@Test
	void productionOpenApiAndRoutingDoNotExposeBaselineTransformEndpoints() throws Exception {
		ReKeyShareApplication.RunningServer server = ReKeyShareApplication.start(0);
		try {
			String base = "http://localhost:" + server.port();
			HttpResponse<String> catalog = HttpClient.newHttpClient().send(
					HttpRequest.newBuilder(URI.create(base + "/openapi.json")).GET().build(),
					HttpResponse.BodyHandlers.ofString());
			assertFalse(catalog.body().contains("/api/grants\""));
			assertFalse(catalog.body().contains("/api/grants/ecc"));
			assertFalse(catalog.body().contains("/api/proxy/re-encrypt"));

			HttpResponse<String> baseline = HttpClient.newHttpClient().send(
					HttpRequest.newBuilder(URI.create(base + "/api/users"))
							.header("Content-Type", "application/x-www-form-urlencoded")
							.POST(HttpRequest.BodyPublishers
									.ofString("userId=baseline-owner&role=OWNER&algorithm=RSA_PRE"))
							.build(),
					HttpResponse.BodyHandlers.ofString());
			assertEquals(403, baseline.statusCode());
		} finally {
			server.stop();
		}
	}
}
