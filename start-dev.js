/**
 * Script tự động khởi động toàn bộ hệ thống IT Blog (Backend FastAPI + Frontend Vite)
 * Tự động tạo .env nếu chưa có, kiểm tra Python và dependencies
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Đảm bảo file .env tồn tại
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('\x1b[33m%s\x1b[0m', '📝 Chưa tìm thấy .env, đang tự động tạo từ .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('\x1b[32m%s\x1b[0m', '✅ Đã tạo file .env thành công tại thư mục gốc!');
}

// 2. Tìm lệnh Python khả dụng trên máy
function getPythonCommand() {
  const venvCandidates = [
    path.join(__dirname, '.venv', 'Scripts', 'python.exe'),
    path.join(__dirname, 'backend', '.venv', 'Scripts', 'python.exe'),
    path.join(__dirname, '.venv', 'bin', 'python'),
    path.join(__dirname, 'backend', '.venv', 'bin', 'python'),
  ];

  for (const candidate of venvCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const globalCommands = ['python', 'py', 'python3'];
  for (const cmd of globalCommands) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch {
      // Bỏ qua thử lệnh tiếp theo
    }
  }

  return null;
}

const pythonCmd = getPythonCommand();

if (!pythonCmd) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Không tìm thấy Python trên máy tính!');
  console.error('Vui lòng cài đặt Python (https://www.python.org/) để chạy Backend.');
} else {
  // Kiểm tra gói backend
  try {
    execSync(`"${pythonCmd}" -c "import fastapi, uvicorn"`, { stdio: 'ignore' });
  } catch {
    console.log('\x1b[33m%s\x1b[0m', '📦 Đang tự động cài đặt các thư viện Python cho backend (vui lòng đợi 1-2 phút)...');
    try {
      execSync(`"${pythonCmd}" -m pip install -r backend/requirements.txt`, { stdio: 'inherit' });
      console.log('\x1b[32m%s\x1b[0m', '✅ Đã cài đặt xong thư viện backend!');
    } catch (err) {
      console.warn('\x1b[33m%s\x1b[0m', '⚠️ Cài đặt tự động gặp sự cố, bạn có thể chạy: pip install -r backend/requirements.txt');
    }
  }
}

// 3. Khởi động Backend (FastAPI - port 8000)
let backendProcess = null;
if (pythonCmd) {
  console.log('\x1b[35m%s\x1b[0m', '🚀 Đang khởi động Backend FastAPI (http://localhost:8000)...');
  const backendScript = path.join(__dirname, 'backend', 'run_server.py');
  
  backendProcess = spawn(pythonCmd, [backendScript], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
  });

  backendProcess.on('error', (err) => {
    console.error('\x1b[31m%s\x1b[0m', `Lỗi khởi động Backend: ${err.message}`);
  });
}

// 4. Kiểm tra gói Frontend (node_modules)
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('\x1b[33m%s\x1b[0m', '📦 Chưa tìm thấy node_modules, đang tự động cài đặt thư viện Frontend (npm install)...');
  try {
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    execSync(`${npmCmd} install`, { cwd: __dirname, stdio: 'inherit' });
    console.log('\x1b[32m%s\x1b[0m', '✅ Đã cài đặt xong thư viện Frontend!');
  } catch (err) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️ Cài đặt tự động npm gặp sự cố, bạn có thể chạy: npm install');
  }
}

// 5. Khởi động Frontend (Vite - port 5173)
console.log('\x1b[36m%s\x1b[0m', '⚡ Đang khởi động Frontend Vite...');
const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

console.log('\n\x1b[32m%s\x1b[0m', '==================================================');
console.log('\x1b[1m\x1b[36m%s\x1b[0m', '  🚀 CÁC ĐƯỜNG DẪN LOCALHOST CỦA HỆ THỐNG:');
console.log('\x1b[1m\x1b[32m%s\x1b[0m', '  👉 Website (Frontend): http://localhost:5173');
console.log('\x1b[1m\x1b[33m%s\x1b[0m', '  👉 Backend API:        http://localhost:8000');
console.log('\x1b[1m\x1b[35m%s\x1b[0m', '  👉 Swagger Docs:       http://localhost:8000/docs');
console.log('\x1b[32m%s\x1b[0m', '==================================================\n');

const frontendProcess = spawn(npxCmd, ['--yes', 'vite'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: isWindows
});

frontendProcess.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', `Lỗi khởi động Frontend: ${err.message}`);
});

// 5. Quản lý dọn dẹp tiến trình khi người dùng ấn Ctrl+C
function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', '🛑 Đang dừng hệ thống...');
  if (backendProcess) {
    try {
      if (isWindows && backendProcess.pid) {
        execSync(`taskkill /pid ${backendProcess.pid} /t /f`, { stdio: 'ignore' });
      } else {
        backendProcess.kill('SIGINT');
      }
    } catch {}
  }
  if (frontendProcess) {
    try {
      if (isWindows && frontendProcess.pid) {
        execSync(`taskkill /pid ${frontendProcess.pid} /t /f`, { stdio: 'ignore' });
      } else {
        frontendProcess.kill('SIGINT');
      }
    } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

