const { spawn } = require('node:child_process');
const path = require('node:path');
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', ...process.argv.slice(2)], {
  cwd: path.resolve(__dirname, '..'), stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_USE_MOCK_DATA: 'true' },
});
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });