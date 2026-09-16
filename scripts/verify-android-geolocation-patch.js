#!/usr/bin/env node

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_EXPECTATIONS = Object.freeze({
  packageVersion: '3.4.0',
  sourceSha256: '3fa2b9d9992922c3213cb502e614ad3a5ff82f7dc1a04f0cff235c0209bb6661',
});

const PATHS = Object.freeze({
  packageJson: 'node_modules/@react-native-community/geolocation/package.json',
  patch: 'patches/@react-native-community+geolocation+3.4.0.patch',
  source:
    'node_modules/@react-native-community/geolocation/android/src/main/java/com/reactnativecommunity/geolocation/PlayServicesLocationManager.java',
});

class VerificationError extends Error {
  constructor(message) {
    super(`[geolocation-patch] ${message}`);
    this.name = 'VerificationError';
  }
}

const normalizeLineEndings = content => content.replace(/\r\n?/g, '\n');

const sha256 = content =>
  crypto.createHash('sha256').update(normalizeLineEndings(content)).digest('hex');

const requireFile = (projectRoot, relativePath, recovery) => {
  const absolutePath = path.join(projectRoot, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new VerificationError(
      `필수 파일이 없습니다: ${relativePath}. ${recovery}`,
    );
  }

  return absolutePath;
};

const verifyProject = (
  projectRoot,
  expectations = DEFAULT_EXPECTATIONS,
) => {
  const patchPath = requireFile(
    projectRoot,
    PATHS.patch,
    'Git에서 패치 파일을 복원한 뒤 npm ci를 실행하세요.',
  );
  const packageJsonPath = requireFile(
    projectRoot,
    PATHS.packageJson,
    'npm ci를 실행하세요.',
  );
  const sourcePath = requireFile(
    projectRoot,
    PATHS.source,
    'npm ci를 실행하세요.',
  );

  let packageMetadata;

  try {
    packageMetadata = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (error) {
    throw new VerificationError(
      `패키지 정보를 읽을 수 없습니다: ${PATHS.packageJson}. npm ci를 실행하세요. (${error.message})`,
    );
  }

  if (packageMetadata.version !== expectations.packageVersion) {
    throw new VerificationError(
      `@react-native-community/geolocation 버전이 다릅니다. ` +
        `expected=${expectations.packageVersion}, actual=${packageMetadata.version ?? 'unknown'}. ` +
        'package.json과 package-lock.json을 확인한 뒤 npm ci를 실행하세요.',
    );
  }

  const sourceHash = sha256(fs.readFileSync(sourcePath, 'utf8'));

  if (sourceHash !== expectations.sourceSha256) {
    throw new VerificationError(
      `Android 위치 패치가 누락됐거나 설치 소스가 변경됐습니다. ` +
        `expected=${expectations.sourceSha256}, actual=${sourceHash}. ` +
        'node_modules를 임의로 수정하지 말고 npm ci를 실행하세요.',
    );
  }

  return {
    packageVersion: packageMetadata.version,
    patchPath,
    sourceHash,
    sourcePath,
  };
};

const run = () => {
  const projectRoot = path.resolve(__dirname, '..');

  try {
    const result = verifyProject(projectRoot);
    console.log(
      `[geolocation-patch] verified version=${result.packageVersion} sha256=${result.sourceHash}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

if (require.main === module) {
  run();
}

module.exports = {
  DEFAULT_EXPECTATIONS,
  PATHS,
  VerificationError,
  normalizeLineEndings,
  sha256,
  verifyProject,
};
