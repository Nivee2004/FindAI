import { spawn } from 'child_process';

console.log('Starting Find AI with Python FastAPI...');

const python = spawn('python', ['main.py'], {
  cwd: process.cwd().replace('/server', ''),
  stdio: 'inherit'
});

python.on('close', (code) => {
  console.log(`Python process exited with code ${code}`);
  process.exit(code || 0);
});
