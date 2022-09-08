const util = require('util');
const { exec } = require('child_process');

const execProm = util.promisify(exec);

const os = require('os');

const plat = os.platform();

const { readdir } = require('node:fs/promises');
const { readFile } = require('node:fs/promises');

const OSErrMsg = 'Operating system is not supported';

let winAPI;
let darwinAPI;
switch (plat){
  case 'win32':
    winAPI = require('./build/Release/winAPI');
    break;
  case 'darwin':
    darwinAPI = require('./build/Release/darwinAPI');
    break;
  default:
    throw new Error(OSErrMsg);
}
  


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
    switch (plat) { // Make platform dependent var ?
      case 'win32':
        return winAPI.getProcessList();
      case 'linux':
        return await getLinuxProc();
      case 'darwin':
        /*const macResult = await execProm("ps -ec -o pid,command | awk '{printf \"%s,\",$1;$1=\"\";print substr($0,2)}'");
        const macProcesses = macResult.stdout.trim()
          .split('\n')
          .slice(1)
          .map((x) => x.trim().split(','));

        return { processes: macProcesses, error: macResult.stderr };*/
        return darwinAPI.getProcessList();
      default:
        throw new Error(OSErrMsg);
    }
  } catch (ex) {
    if (ex.stderr !== undefined) {
      return { processes: null, error: ex.stderr };
    }
    return { processes: null, error: ex.message };
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
async function killProcByPID(pid) {
  const tempPid = parseInt(pid, 10);

  if (!Number.isInteger(tempPid)) {
    return { result: null, error: 'PID is not a number' };
  }

  try {
    return {result: process.kill(pid, process.SIGTERM), error:null};
  } catch (ex) {
    return { result: null, error: ex.code };
  }
}

module.exports = {
  getProcList,
  killProcByPID,
};
