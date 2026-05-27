package com.example.pre.storage.objectstore;

import com.example.pre.crypto.hash.Hash;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Arrays;

public final class FileObjectStore implements ObjectStore {
	private final Path root;

	public FileObjectStore(Path root) {
		this.root = root.toAbsolutePath().normalize();
		try {
			Files.createDirectories(this.root);
		} catch (IOException e) {
			throw new IllegalStateException("cannot initialize object store", e);
		}
	}

	@Override
	public StoredCiphertext putCiphertext(String tenantId, String dataId, byte[] ciphertext) {
		Path target = objectPath(tenantId, dataId);
		try {
			Files.createDirectories(target.getParent());
			Files.write(target, Arrays.copyOf(ciphertext, ciphertext.length), StandardOpenOption.CREATE,
					StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
			return new StoredCiphertext(toUri(tenantId, dataId), Hash.sha256Hex(ciphertext), ciphertext.length);
		} catch (IOException e) {
			throw new IllegalStateException("ciphertext write failed", e);
		}
	}

	@Override
	public byte[] getCiphertext(String tenantId, String uri) {
		String prefix = "file-store://" + safeSegment(tenantId) + "/";
		if (uri == null || !uri.startsWith(prefix)) {
			throw new IllegalArgumentException("object not accessible");
		}
		String dataId = uri.substring(prefix.length());
		Path path = objectPath(tenantId, dataId);
		try {
			if (!Files.exists(path)) {
				throw new IllegalArgumentException("object not accessible");
			}
			return Files.readAllBytes(path);
		} catch (IOException e) {
			throw new IllegalStateException("ciphertext read failed", e);
		}
	}

	@Override
	public boolean verifyDigest(String tenantId, String uri, String expectedDigest) {
		return Hash.sha256Hex(getCiphertext(tenantId, uri)).equals(expectedDigest);
	}

	@Override
	public void deleteMarker(String tenantId, String uri) {
		getCiphertext(tenantId, uri);
		Path tombstone = root.resolve("deleted").resolve(Hash.sha256Hex(uri) + ".marker").normalize();
		try {
			Files.createDirectories(tombstone.getParent());
			Files.writeString(tombstone, uri, StandardOpenOption.CREATE_NEW);
		} catch (java.nio.file.FileAlreadyExistsException ignored) {
			// An existing marker is already an append-only deletion record.
		} catch (IOException e) {
			throw new IllegalStateException("delete marker write failed", e);
		}
	}

	private Path objectPath(String tenantId, String dataId) {
		Path path = root.resolve("ciphertexts").resolve(safeSegment(tenantId)).resolve(safeSegment(dataId) + ".bin")
				.normalize();
		if (!path.startsWith(root)) {
			throw new IllegalArgumentException("object not accessible");
		}
		return path;
	}

	private static String toUri(String tenantId, String dataId) {
		return "file-store://" + safeSegment(tenantId) + "/" + safeSegment(dataId);
	}

	private static String safeSegment(String value) {
		if (value == null || value.isBlank() || !value.matches("[A-Za-z0-9._-]{1,128}")) {
			throw new IllegalArgumentException("invalid object identifier");
		}
		return value;
	}
}
