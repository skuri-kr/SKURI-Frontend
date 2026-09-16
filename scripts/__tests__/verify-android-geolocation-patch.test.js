'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {afterEach, test} = require('node:test');

const {
  PATHS,
  sha256,
  verifyProject,
} = require('../verify-android-geolocation-patch');

const PATCHED_SOURCE = 'patched\nsource\n';
const EXPECTATIONS = Object.freeze({
  packageVersion: '3.4.0',
  sourceSha256: sha256(PATCHED_SOURCE),
});
const temporaryRoots = [];

const writeFixtureFile = (root, relativePath, content) => {
  const destination = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.writeFileSync(destination, content);
};

const createFixture = ({
  includePackageJson = true,
  includePatch = true,
  includeSource = true,
  source = PATCHED_SOURCE,
  version = EXPECTATIONS.packageVersion,
} = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skuri-geolocation-patch-'));
  temporaryRoots.push(root);

  if (includePatch) {
    writeFixtureFile(root, PATHS.patch, 'fixture patch');
  }

  if (includePackageJson) {
    writeFixtureFile(root, PATHS.packageJson, JSON.stringify({version}));
  }

  if (includeSource) {
    writeFixtureFile(root, PATHS.source, source);
  }

  return root;
};

const expectFailure = (root, pattern) => {
  assert.throws(
    () => verifyProject(root, EXPECTATIONS),
    error => {
      assert.match(error.message, pattern);
      return true;
    },
  );
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('accepts the expected patched source with normalized line endings', () => {
  const root = createFixture({source: PATCHED_SOURCE.replace(/\n/g, '\r\n')});

  const result = verifyProject(root, EXPECTATIONS);

  assert.equal(result.packageVersion, '3.4.0');
  assert.equal(result.sourceHash, EXPECTATIONS.sourceSha256);
});

test('rejects the original unpatched source', () => {
  const root = createFixture({source: 'original\nsource\n'});

  expectFailure(root, /패치가 누락됐거나 설치 소스가 변경됐습니다/);
});

test('rejects a partially applied patch', () => {
  const root = createFixture({source: 'patched\nsource\npartial change\n'});

  expectFailure(root, /expected=.*actual=.*npm ci/);
});

test('rejects a different installed package version', () => {
  const root = createFixture({version: '3.5.0'});

  expectFailure(root, /expected=3\.4\.0, actual=3\.5\.0/);
});

test('rejects a missing tracked patch file', () => {
  const root = createFixture({includePatch: false});

  expectFailure(root, /패치 파일을 복원한 뒤 npm ci/);
});

test('rejects a missing installed package', () => {
  const root = createFixture({includePackageJson: false});

  expectFailure(root, /geolocation\/package\.json.*npm ci/);
});

test('rejects a missing installed Android source', () => {
  const root = createFixture({includeSource: false});

  expectFailure(root, /PlayServicesLocationManager\.java.*npm ci/);
});
