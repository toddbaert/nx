import { ExecutorContext } from '@nx/devkit';
import { VerdaccioExecutorSchema } from './schema';
import { ChildProcess, execSync, fork } from 'child_process';

let childProcess: ChildProcess;

/**
 * - set npm and yarn to use local registry
 * - start verdaccio
 * - stop local registry when done
 */
export async function verdaccioExecutor(
  options: VerdaccioExecutorSchema,
  context: ExecutorContext
) {
  try {
    execSync(
      `npm config set registry http://localhost:${options.port}/ --location ${options.location}`
    );
    execSync(`yarn config set registry http://localhost:${options.port}/`);

    const processExitListener = (signal?: number | NodeJS.Signals) => {
      if (childProcess) {
        childProcess.kill(signal);
      }
      execSync(`npm config delete registry --location ${options.location}`);
      execSync('yarn config delete registry');
    };
    process.on('exit', processExitListener);
    process.on('SIGTERM', processExitListener);
    process.on('SIGINT', processExitListener);
    process.on('SIGHUP', processExitListener);

    await startVerdaccio(options);
  } catch (e) {
    return {
      success: false,
    };
  }
  return {
    success: true,
  };
}

/**
 * Fork the verdaccio process: https://verdaccio.org/docs/verdaccio-programmatically/#using-fork-from-child_process-module
 */
function startVerdaccio(options: VerdaccioExecutorSchema) {
  return new Promise((resolve, reject) => {
    childProcess = fork(
      require.resolve('verdaccio/bin/verdaccio'),
      createVerdaccioOptions(options),
      {
        env: {
          ...process.env,
          VERDACCIO_HANDLE_KILL_SIGNALS: 'true',
          ...(options.storage
            ? { VERDACCIO_STORAGE_PATH: options.storage }
            : {}),
        },
      }
    );

    childProcess.on('error', (err) => {
      reject(err);
    });
    childProcess.on('disconnect', (err) => {
      reject(err);
    });
    childProcess.on('exit', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(code);
      }
    });
  });
}

function createVerdaccioOptions(options: VerdaccioExecutorSchema) {
  return Object.keys(options).reduce((acc, k) => {
    const v = options[k];
    if (k === 'port') {
      acc.push('--listen', v.toString());
    } else if (k === 'config') {
      acc.push(`--${k}`, v);
    }
    return acc;
  }, []);
}

export default verdaccioExecutor;
