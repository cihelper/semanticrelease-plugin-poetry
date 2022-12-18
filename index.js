// https://github.com/semantic-release/semantic-release/blob/master/docs/usage/plugins.md
const execa = require("execa");
const path = require("path");

async function verifyConditions(pluginConfig, context) {}

async function prepare(pluginConfig, context) {
  // https://github.com/semantic-release/npm/blob/master/lib/prepare.js
  const {
    cwd,
    env,
    stdout,
    stderr,
    nextRelease: { version },
    logger,
  } = context;
  const { pkgRoot } = pluginConfig;

  const basePath = pkgRoot ? path.resolve(cwd, pkgRoot) : cwd;

  const versionResult = execa("poetry", ["version", version], {
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

  if (publishPoetry !== false) {
    const basePath = pkgRoot ? path.resolve(cwd, pkgRoot) : cwd;
    logger.log(`Publishing version ${version} to pypi registry`);

    const result = execa(
      "poetry",
      [
        "publish",
        "--username",
        "__token__",
        "--password",
        "$PYPI_TOKEN",
        "--no-interaction",
        "-vvv",
      ],
      { cwd: basePath, env, preferLocal: true }
    );
    result.stdout.pipe(stdout, { end: false });
    result.stderr.pipe(stderr, { end: false });
    await result;

    logger.log(`Published ${pkg.name}==${version} to pypi`);

    return {
      name: `pypi package`,
      url: `https://pypi.org/project/${name}/${version}/`,
    };
  }

  logger.log(`Skip publishing to npm registry as publishPoetry is false`);
  return false;
}

module.exports = { prepare, publish };
