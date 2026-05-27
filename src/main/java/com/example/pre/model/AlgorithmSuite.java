package com.example.pre.model;

/**
 * Protocol-level suites. Baseline suites are intentionally not production
 * choices.
 */
public enum AlgorithmSuite {
	RSA_PRE_BASELINE(false, true), ECC_PRE_BASELINE(false, true), POLICY_BOUND_PRE_V1(false,
			false), SECURE_ENVELOPE_V1(true, false), HPKE_STYLE_ENVELOPE_V1(true, false);

	private final boolean productionReviewedPath;
	private final boolean demoOnly;

	AlgorithmSuite(boolean productionReviewedPath, boolean demoOnly) {
		this.productionReviewedPath = productionReviewedPath;
		this.demoOnly = demoOnly;
	}

	public boolean productionReviewedPath() {
		return productionReviewedPath;
	}

	public boolean demoOnly() {
		return demoOnly;
	}
}
