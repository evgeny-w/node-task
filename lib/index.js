const util = require('util');
const { exec } = require('child_process');

const execProm = util.promisify(exec);

const os = require('os');

const platform = os.platform();

const { readdir, readFile } = require('node:fs/promises');

const OSErrMsg = 'Operating system is not supported';

/**
 * @typedef {Object} ProcessOutputFormat
 * @property {Array.<string[]>} processes - List of processes
 * @property {string} error - Any error(s) encountered
 */
/**
 * @typedef {Object} KillOutputFormat
 * @property {string} result - Result of the operation
 * @property {string} error - Any error(s) encountered
 */

/**
 * Gets a list of processes from a linux system
 * @example
 * // returns {
 * //     processes: [
 * //       [ 1, '/sbin/init\x00splash' ],
 * //       ... more items
 * //     ],
 * //     error: ''
 * //   }
 * getLinuxProc();
 * @returns {ProcessOutputFormat} Returns the list of processes or any errors encountered.
 */
async function getLinuxProc() { // In progress. Not tested
  const out = [];
  try {
    const files = await readdir('/proc/');
    const promises = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      if (file[0] >= '0' && file[0] <= '9') {
        if (!Number.isNaN(parseInt(file, 10))) {
          const statPath = `/proc/${file}/cmdline`;
          promises.push(readFile(statPath, 'utf-8').then(async (data) => {
            try {
              const dataBytes = data.slice(0, -1);
              if (dataBytes !== '') {
                out.push([file, dataBytes]);
              }
            } catch (err) {
              // Error here means that the process does not exist anymore
            }
          }));
        }
      }
    }
    await Promise.all(promises);
  } catch (err) {
    return { processes: null, error: err };
  }
  return { processes: out, error: null };
}

function getProcessListBin(pathToBinFile) {
  return async () => {
    const result = await execProm(pathToBinFile);

    const processes = result.stdout
      ? result.stdout.trim()
        .split('\n')
        .map((process) => process.trim().split(','))
      : null;

    return { processes, error: result.stderr };
  };
}

function getProcessListUnsupportedOS() {
  return Promise.reject(new Error(OSErrMsg));
}

/**
 * Gets a list of processes from the operating system
 * @example
 * // returns {
 * //     processes: [
 * //       ['0','System Idle Process'],
 * //       ... more items
 * //     ],
 * //     error: ''
 * //   }
 * getProcessList();
 * @example
 * // returns {
 * //     processes: null,
 * //     error: 'Operating system not supported'
 * //   }
 * getProcessList();
 * @returns {ProcessOutputFormat} Returns the list of processes or any errors encountered.
 */
async function getProcessList() {
  const processListMap = {
    win32: getProcessListBin(`${__dirname}\\bin\\getProcessListWindows.exe`),
    darwin: getProcessListBin('./bin/getProcessListMac'),
    linux: getLinuxProc,
  };

  const getProcessListFunction = processListMap[platform] ?? getProcessListUnsupportedOS;

  return getProcessListFunction()
    .catch((e) => ({
      processes: null,
      error: e.stderr || e.message,
    }));
}

const unixKill = (pid) => execProm(`kill -9 ${pid}`);
const win32Kill = (pid) => execProm(`taskkill /F /PID ${pid}`);
const unsupportedOSKill = () => Promise.reject(new Error(OSErrMsg));

/**
 * Kills a process by its PID
 * @example
 * // returns {
 * //     result: 'SUCCESS: The process ... has been terminated.',
 * //     error: ''
 * //   }
 * killProcByPID(2696);
 * @example
 * // returns {
 * //     result: null,
 * //     error: 'ERROR: The process ... could not be terminated ...'
 * //   }
 * killProcByPID(0);
 * @example
 * // returns {
 * //     result: null,
 * //     error: 'ERROR: The process ... not found.'
 * //   }
 * killProcByPID(-5);
 * @example
 * // returns {
 * //     result: null,
 * //     error: 'Operating system not supported'
 * //   }
 * killProcByPID(2696);
 * @example
 * // returns {
 * //     result: null,
 * //     error: 'PID is not a number'
 * //   }
 * killProcByPID('five');
 * @example
 * // On Unix:
 * // returns {result:'',error:''}
 * killProcByPID('5321');
 * @returns {KillOutputFormat} Returns whether the operation was successful
 */
async function killProcByPID(pidString) {
  const pid = parseInt(pidString, 10);

  if (!Number.isInteger(pid)) {
    return { result: null, error: 'PID is not a number' };
  }

  const killMap = {
    win32: win32Kill,
    darwin: unixKill,
    linux: unixKill,
  };

  const killFunction = killMap[platform] ?? unsupportedOSKill;

  return killFunction(pid)
    .then(({ stdout, stderr }) => ({
      result: stdout,
      error: stderr,
    }))
    .catch((e) => ({
      result: null,
      error: e.stderr || e.message,
    }));
}

module.exports = {
  getProcessList,
  killProcByPID,
};
