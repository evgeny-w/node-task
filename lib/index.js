const util = require('util');
const { exec } = require('child_process');

// region ffi
const ffi = require('ffi-napi');
const ref = require('ref-napi');
const StructType = require('ref-struct-napi');
const ArrayType = require('ref-array-napi');

const { int } = ref.types;
const cstr = ref.types.CString;

const process = StructType({
  pid: int,
  executable: cstr,
});

const ProcessArray = ArrayType(process);

const lib = ffi.Library(__dirname+'/go-ps/wrapper', { getProcess: ['int', ['int', ProcessArray]], Free: ['void', []] });
const processList = new ProcessArray(10000);
// endregion

const execProm = util.promisify(exec);

const os = require('os');

const platform = os.platform();

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
 * @returns {ProcessOutputFormat} Returns the list of processes or any errors encountered.
 */
async function getProcList() {
  try {
    const filled = lib.getProcess(processList.length, processList);
    //Warning: if filled = processList.length, processList is not long enough. However creating processList every time leaks ram.
    const processes = [];
    for (let i = 0; i < filled; i += 1) {
      processes[i] = [processList[i].pid, processList[i].executable]; // Does not support .map()
    }
    lib.Free();
    return { processes, error: null };
  } catch (e) {
    return { processes: null, error: e.stderr || e.message };
  }
}

const unixKill = (pid) => execProm(`kill -9 ${pid}`);
const win32Kill = (pid) => execProm(`taskkill /F /PID ${pid}`);
const unsupportedOSKill = () => Promise.reject(new Error(OSErrMsg));

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
  getProcList,
  killProcByPID,
};