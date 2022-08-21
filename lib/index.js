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
 * getProcList();
 * @example
 * // returns {
 * //     processes: null,
 * //     error: 'Operating system not supported'
 * //   }
 * getProcList();
 * @returns {ProcessOutputFormat} Returns the list of processes or any errors encountered.
 */
async function getProcList() {
  try {
    switch (platform) { // Make platform dependent var ?
      case 'win32':
        const winResult = await execProm('tasklist /FO CSV');
        const winProcesses = winResult.stdout.trim()
          .split('\r\n')
          .slice(1)// Remove "Image Name","PID","Session Name","Session#","Mem Usage" element
          .map((process) => process
            .slice(1)
            .trim()
            .split(',')
            .slice(0, 2)
            .reverse());

        return { processes: winProcesses, error: winResult.stderr };
      case 'linux':
        return await getLinuxProc();
      case 'darwin':
        const macResult = await execProm("ps -ec -o pid,command | awk '{printf \"%s,\",$1;$1=\"\";print substr($0,2)}'");
        const macProcesses = macResult.stdout.trim()
          .split('\n')
          .slice(1) // Remove PID,COMMAND element
          .map((process) => process.trim().split(','));

        return { processes: macProcesses, error: macResult.stderr };
      default:
        throw new Error(OSErrMsg);
    }
  } catch (ex) {
    return { processes: null, error: ex.stderr || ex.message };
  }
}

/*
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

  try {
    switch (platform) {
      case 'win32':
        const winResult = await execProm(`C:/Windows/System32/taskkill /F /PID ${pid}`);

        return { result: winResult.stdout, error: winResult.stderr };
      case 'linux':
      case 'darwin':
        const macResult = await execProm(`kill -9 ${pid}`);

        return { result: macResult.stdout, error: macResult.stderr };
      default:
        throw new Error(OSErrMsg);
    }
  } catch (ex) {
    return { result: null, error: ex.stderr || ex.message };
  }
}

module.exports = {
  getProcList,
  killProcByPID,
};
