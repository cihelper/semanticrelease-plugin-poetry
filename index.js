// https://github.com/semantic-release/semantic-release/blob/master/docs/usage/plugins.md
const execa = require("execa");
const path = require("path");
const toml = require("@iarna/toml");
const fs = require("fs");

async function verifyConditions(pluginConfig, context) {}

const channelMap = {
  alpha: "a",
  beta: "b",
  next: "rc",
  rc: "rc",
  // dev is not definded as it is the default fallback value
};

// nextRelease.type: patch
// nextRelease.channel: beta
// nextRelease.version: 1.2.3-beta.1
// nextRelease.gitTag: v1.2.3-beta.1
// nextRelease.name: v1.2.3-beta.1

async function prepare(pluginConfig, context) {
  // https://github.com/semantic-release/npm/blob/master/lib/prepare.js
  const {
    cwd,
    env,
    stdout,
    stderr,
    nextRelease: { version, channel },
    logger,
  } = context;
  const { pkgRoot } = pluginConfig;

  const basePath = pkgRoot ? path.resolve(cwd, pkgRoot) : cwd;
  let pepVersion = version;

  if (channel !== undefined) {
    const [mainVersion, versionSuffix] = version.split("-");
    const [, buildVersion] = versionSuffix.split(".");
    const separator = channelMap[channel] ?? "dev";
    pepVersion = `${mainVersion}${separator}${buildVersion}`;
  }

  const versionResult = execa("poetry", ["version", pepVersion], {
    cwd: basePath,
    env,
    preferLocal: true,
  });
  versionResult.stdout.pipe(stdout, { end: false });
  versionResult.stderr.pipe(stderr, { end: false });

  await versionResult;

  logger.log("Creating pypi package version %s", version);
  const buildresult = execa("poetry", ["build"], {
    cwd: basePath,
    env,
    preferLocal: true,
  });
  buildresult.stdout.pipe(stdout, { end: false });
  buildresult.stderr.pipe(stderr, { end: false });

  await buildresult;
}

async function publish(pluginConfig, context) {
  // https://github.com/semantic-release/npm/blob/master/lib/publish.js
  const {
    cwd,
    env,
    stdout,
    stderr,
    nextRelease: { version },
    logger,
  } = context;
  const { publishPoetry, pkgRoot } = pluginConfig;
  const { PYPI_TOKEN } = env;

  if (publishPoetry !== false) {
    const basePath = pkgRoot ? path.resolve(cwd, pkgRoot) : cwd;

    const pyprojectContent = fs
      .readFileSync(path.join(basePath, "pyproject.toml"))
      .toString();
    const pyproject = toml.parse(pyprojectContent);
    const pypiName = pyproject.tool.poetry.name;
    const pypiVersion = pyproject.tool.poetry.version;

    logger.log(`Publishing version ${pypiVersion} to pypi registry`);

    const result = execa(
      "poetry",
      [
        "publish",
        "--username",
        "__token__",
        "--password",
        PYPI_TOKEN,
        "--no-interaction",
        "-vvv",
      ],
      { cwd: basePath, env, preferLocal: true }
    );
    result.stdout.pipe(stdout, { end: false });
    result.stderr.pipe(stderr, { end: false });
    await result;

    logger.log(`Published ${pypiName}==${pypiVersion} to pypi`);

    return {
      name: `pypi package`,
      url: `https://pypi.org/project/${pypiName}/${pypiVersion}/`,
    };
  }

  logger.log(`Skip publishing to npm registry as publishPoetry is false`);
  return false;
}

module.exports = { prepare, publish };
