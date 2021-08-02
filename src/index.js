const { Command, flags } = require('@oclif/command');

const {
  sleep,
  getNotarizationInfo,
  getRequestStatus,
  notarizeApp,
  staple,
} = require('./util');

class NotarizeCliCommand extends Command {
  async run() {
    // eslint-disable-next-line no-shadow
    const { flags } = this.parse(NotarizeCliCommand);
    process.stdout.write('Uploading file... ');
    const requestUuid = await notarizeApp(
      flags.file,
      flags['bundle-id'],
      flags.username,
      flags.password,
    ).catch(() => undefined);
    console.log('done');
    if (!requestUuid) {
      console.error('Error: could not upload file for notarization');
    } else {
      let requestStatus = 'in progress';

      // Sometimes Apple receives the upload and issues a UUID, but is not ready to return request status right away
      // Allow up to 5 retries on error before giving up and calling this an actual failure
      let retries = 0;

      while (requestStatus === 'in progress') {
        process.stdout.write('Waiting for notarization status... ');
        await sleep(10 * 1000);
        requestStatus = await getRequestStatus(
          requestUuid,
          flags.username,
          flags.password,
        ).catch(() => 'error');

        console.log(requestStatus);

        if (requestStatus === 'error' && retries <= 5) {
          retries += 1;
          requestStatus = 'in progress';
        }
      }
      if (requestStatus === 'success' && !flags['no-staple']) {
        staple(flags.file);
      }
      const notarizationInfo = await getNotarizationInfo(
        requestUuid,
        flags.username,
        flags.password,
      ).catch(() => undefined);
      // eslint-disable-next-line no-unused-expressions
      notarizationInfo
        ? console.log(notarizationInfo)
        : console.error('Error: could not get notarization info');
      if (requestStatus !== 'success') {
        console.error(`Error: could not notarize file`);
      }
    }
  }
}

NotarizeCliCommand.description = `Notarize a macOS app from the command line
`;

NotarizeCliCommand.flags = {
  file: flags.string({
    description: 'path to the file to notarize',
    required: true,
  }),
  'bundle-id': flags.string({
    description: 'bundle id of the app to notarize',
    required: true,
    env: 'PRODUCT_BUNDLE_IDENTIFIER',
  }),
  username: flags.string({
    description: 'username to use for authentication',
    required: true,
    env: 'NOTARIZE_USERNAME',
  }),
  password: flags.string({
    description: 'password to use for authentication',
    required: true,
    env: 'NOTARIZE_PASSWORD',
  }),
  'no-staple': flags.boolean({
    description: 'disable automatic stapling',
    default: false,
  }),
  version: flags.version({ char: 'v' }),
  help: flags.help({ char: 'h' }),
};

module.exports = NotarizeCliCommand;
