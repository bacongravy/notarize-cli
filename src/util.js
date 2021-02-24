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

const notarizeApp = async (file, bundleId, username, password, provider) => {
  if(provider == "") {
    const { stdout } = await execa('xcrun', [
      'altool',
      '--notarize-app',
      '--file',
      file,
      '--primary-bundle-id',
      bundleId,
      '--username',
      username,
      '--password',
      password,
      '--output-format',
      'json',
    ]);
    let requestUuid;
    try {
      requestUuid = JSON.parse(stdout)['notarization-upload'].RequestUUID;
    } catch (error) {
      console.error(stdout);
    }
    return requestUuid;
  }
  else {
    const { stdout } = await execa('xcrun', [
      'altool',
      '--notarize-app',
      '--file',
      file,
      '--primary-bundle-id',
      bundleId,
      '--username',
      username,
      '--password',
      password,
      '--asc-provider',
      provider,
      '--output-format',
      'json',
    ]);
    let requestUuid;
    try {
      requestUuid = JSON.parse(stdout)['notarization-upload'].RequestUUID;
    } catch (error) {
      console.error(stdout);
    }
    return requestUuid;
  }
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
