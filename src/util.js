const execa = require('execa');

const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getNotarizationInfo = async (requestUuid, username, password) => {
  const { stdout } = await execa('xcrun', [
    'altool',
    '--notarization-info',
    requestUuid,
    '--username',
    username,
    '--password',
    password,
    '--output-format',
    'json',
  ]);
  let notarizationInfo;
  try {
    notarizationInfo = JSON.parse(stdout)['notarization-info'];
  } catch (error) {
    console.error(stdout);
  }
  return notarizationInfo;
};

const getRequestStatus = async (requestUuid, username, password) => {
  const info = await getNotarizationInfo(requestUuid, username, password);
  return info ? info.Status : 'unknown';
};

const notarizeApp = async (file, bundleId, provider, username, password) => {
  var xcrun_args = ['altool', '--notarize-app'];
  if (file !== undefined) {
    xcrun_args.push('--file', file);
  }
  if (bundleId !== undefined) {
    xcrun_args.push('--primary-bundle-id', bundleId);
  }
  if (provider !== undefined) {
    xcrun_args.push('--asc-provider', provider);
  }
  if (username !== undefined) {
    xcrun_args.push('--username', username);
  }
  if (password !== undefined) {
    xcrun_args.push('--password', password);
  }
  xcrun_args.push('--output-format', 'json');
  const { stdout } = await execa('xcrun', xcrun_args);
  let requestUuid;
  try {
    requestUuid = JSON.parse(stdout)['notarization-upload'].RequestUUID;
  } catch (error) {
    console.error(stdout);
  }
  return requestUuid;
};

const staple = async (file) => {
  const { stdout } = await execa('xcrun', ['stapler', 'staple', file]);
  return stdout;
};

module.exports = {
  sleep,
  getNotarizationInfo,
  getRequestStatus,
  notarizeApp,
  staple,
};
