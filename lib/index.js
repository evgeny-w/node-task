const util = require('util');
const { readdir, readFile } = require('node:fs/promises');
const { exec } = require('child_process');

const execProm = util.promisify(exec);
const os = require('os');

const platform = os.platform();

const OSErrMsg = 'Operating system is not supported';

/**
 * Gets a list of processes from a linux system
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

/**
 * Kills a process by its PID
 */
async function killProcByPID(pidString) {
  const pid = parseInt(pidString, 10);

  if (!Number.isInteger(pid)) {
    return { result: null, error: 'PID is not a number' };
  }

  try {
    const res = process.kill(pid);
    return Promise.resolve(res);
  } catch (e) {
    return Promise.reject(e);
  }
}

module.exports = {
  getProcessList,
  killProcByPID,
};
