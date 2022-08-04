const execa = require('execa');

const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getNotarizationInfo = async (requestUuid, username, password) => {
  const { stdout, stderr } = await execa('xcrun', [
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
  let tryLegacy = false;

  try {
    notarizationInfo = JSON.parse(stdout)['notarization-info'];
  } catch (error) {
    tryLegacy = true;
    console.error(`Could not parse as JSON. Will try legacy mode.`);
  }

  if (tryLegacy) {
    try {
      notarizationInfo = parseLegacyNotarizationInfo(stderr)
    } catch (e) {
      console.error(`Could not parse as legacy key/value pairs: ${e} stdout: ${stdout}. stderr: ${stderr}`);
    }
  }
  return notarizationInfo;
};

const parseLegacyNotarizationInfo = (response) => {
  let uuidMatches = response.match(/RequestUUID.\s(.*)\s*/)
  let dateMatches = response.match(/Date.\s(.*)\s*/)
  let statusMatches = response.match(/Status.\s(.*)\s/)
  let logFileURLMatches = response.match(/LogFileURL.\s(.*)\s/)
  let statusCodeMatches = response.match(/Status Code.\s(.*)\s/)
  let statusMessageMatches = response.match(/Status Message.\s(.*)\s/)

  return {
    RequestUUID: uuidMatches ? uuidMatches[1] : '',
    Date: dateMatches ? dateMatches[1] : '',
    Status: statusMatches ? statusMatches[1] : '',
    LogFileURL: logFileURLMatches ? logFileURLMatches[1] : '',
    StatusCode: statusCodeMatches ? statusCodeMatches[1] : '',
    StatusMessage: statusMessageMatches ? statusMessageMatches[1] : '',
  }
};

const getRequestStatus = async (requestUuid, username, password) => {
  const info = await getNotarizationInfo(requestUuid, username, password);
  return info ? info.Status : 'unknown';
};

const notarizeApp = async (file, bundleId, provider, username, password) => {
  let failed;
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
  const { stdout, stderr } = await execa('xcrun', xcrun_args).catch((e) => { failed = true; return e });
  let requestUuid, error;
  if (failed) {
    try {
      error = JSON.parse(stdout)['product-errors'][0].message
    } catch (e) {
      console.error(`Error parsing product errors: ${e}. Stdout: ${stdout}. Stderr: ${stderr}`)
    }
  } else {
    let parseLegacyUUID = false
    try {
      requestUuid = JSON.parse(stdout)['notarization-upload'].RequestUUID;
    } catch (e) {
      parseLegacyUUID = true
      console.error(`Error parsing UUID from JSON. Will try legacy mode.`)
    }

    if (parseLegacyUUID === true) {
      try {
        // Older versions of MacOS don't support the json output, so parse the structured output
        // RequestUUID = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const pattern = /RequestUUID\s=\s(.*)/
        requestUuid = stderr.match(pattern)[1]
      } catch (e) {
        console.error(`Error parsing UUID from structured data: ${e}. Stdout: ${stdout}. Stderr: ${stderr}`)
      }
    }
  }

  return { requestUuid, error };
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
