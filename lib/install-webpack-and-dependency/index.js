import fs from 'fs';
import path from 'path';
import childProcess from 'child_process';
import _ from 'underscore';

export default function(webpackSetup, dependencySetup, callback) {
  const installCommand = `yarn add --no-lockfile ${webpackSetup} ${dependencySetup}`;

  childProcess.exec(installCommand, { TRAVIS: true }, function(err, stdout, stderr) {
    if (err) {
      callback(['Error calling install command', err]);
      return;
    }

    if (stderr) {
      const outputted = stderr.trim().split('\n');
      const errors = _.reduce(outputted, function(validErrors, errLine) {
        if (errLine.indexOf('warning') === 0) {
          return validErrors;
        }

        validErrors.push(errLine);
        return validErrors;
      }, []);

      if (errors.length > 0) {
        callback(['Error output when installing', errors.join('\n')]);
        return;
      }
    }

    if (stdout.indexOf(webpackSetup.toLocalName()) === -1 ||
        stdout.indexOf(dependencySetup.toLocalName()) === -1) {
      callback(['Expected versions not in dependency tree', stdout]);
      return;
    }

    const dependencyInstallLocation = path.join('node_modules', dependencySetup.toLocalName());
    const packageLocation = path.join(dependencyInstallLocation, 'package.json');
    if (!fs.existsSync(packageLocation)) {
      callback();
      return;
    }

    childProcess.exec('yarn install --peer', { cwd: dependencyInstallLocation, TRAVIS: true }, function(err) {
      if (err) {
        callback(['Error calling install command for dependency build', err]);
        return;
      }

      callback();
    });
  });
}
