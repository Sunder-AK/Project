import net from 'net';
import { spawn } from 'child_process';

const PORT = 5432;
const HOST = '127.0.0.1';

const server = net.createServer((socket) => {
  const wsl = spawn('wsl.exe', ['-d', 'Ubuntu', '-u', 'postgres', '--', 'nc', '127.0.0.1', '5432'], {
    stdio: ['pipe', 'pipe', 'ignore']
  });

  socket.pipe(wsl.stdin);
  wsl.stdout.pipe(socket);

  socket.on('error', () => {
    wsl.kill();
  });

  wsl.on('error', () => {
    socket.destroy();
  });

  socket.on('close', () => {
    wsl.kill();
  });

  wsl.on('close', () => {
    socket.destroy();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Tunnel listening on ${HOST}:${PORT} -> WSL PostgreSQL:5432`);
});
