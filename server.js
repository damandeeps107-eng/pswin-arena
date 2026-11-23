const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'entries.json');

// Ensure data file exists with default seed
if (!fs.existsSync(DATA_FILE)) {
  const initialData = {
    totalSlots: 500,
    entries: [
      {
        id: "GTA6-PS5-927401",
        ticketNo: 742,
        name: "Aman Sharma",
        phone: "9876543210",
        email: "aman.s@example.com",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110001",
        fullAddress: "Flat 402, Royal Residency, Connaught Place",
        utr: "432189076541",
        amount: 219,
        score: 5,
        timeTaken: 11.4,
        paymentStatus: "VERIFIED",
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        id: "GTA6-PS5-883912",
        ticketNo: 743,
        name: "Rahul Verma",
        phone: "9811223344",
        email: "rahul.v@example.com",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400050",
        fullAddress: "12B, Bandra West, Near Hill Road",
        utr: "432190123890",
        amount: 219,
        score: 5,
        timeTaken: 13.8,
        paymentStatus: "VERIFIED",
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        id: "GTA6-PS5-714088",
        ticketNo: 744,
        name: "Vikramjit Singh",
        phone: "9899001122",
        email: "vikram.singh@example.com",
        city: "Chandigarh",
        state: "Punjab",
        pincode: "160022",
        fullAddress: "House No 245, Sector 35-C",
        utr: "432202198765",
        amount: 219,
        score: 4,
        timeTaken: 9.6,
        paymentStatus: "VERIFIED",
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString()
      }
    ]
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { totalSlots: 500, entries: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Routes
  if (pathname === '/api/stats' && req.method === 'GET') {
    const data = readData();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      totalSlots: data.totalSlots || 500,
      claimedSlots: data.entries.length + 312,
      realEntriesCount: data.entries.length,
      prizes: {
        ps5Count: 1,
        gta6Count: 10
      },
      drawDate: "2026-12-15T20:00:00+05:30",
      entryFee: 219
    }));
    return;
  }

  // Live Leaderboard (Sorted by score DESC, timeTaken ASC)
  if (pathname === '/api/leaderboard' && req.method === 'GET') {
    const data = readData();
    const sorted = [...data.entries].sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) {
        return (b.score || 0) - (a.score || 0);
      }
      return (a.timeTaken || 99) - (b.timeTaken || 99);
    });

    const leaderboard = sorted.slice(0, 15).map((e, index) => ({
      rank: index + 1,
      name: e.name.split(' ')[0] + ' ' + (e.name.split(' ')[1] ? e.name.split(' ')[1][0] + '.' : ''),
      city: e.city,
      score: e.score || 5,
      timeTaken: e.timeTaken || 12.0,
      ticketNo: e.ticketNo,
      prizeTitle: index === 0 ? "🏆 Grand Champion: Sony PS5 Slim + GTA VI" : (index < 10 ? "🎮 Rank " + (index + 1) + ": GTA VI Launch Disc" : "🎖️ Top 15 Contender")
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(leaderboard));
    return;
  }

  if (pathname === '/api/track' && req.method === 'GET') {
    const query = (parsedUrl.query.q || '').trim();
    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Reference Code or Phone number is required." }));
      return;
    }

    const data = readData();
    const cleanedQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Sort to determine current rank
    const sorted = [...data.entries].sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      return (a.timeTaken || 99) - (b.timeTaken || 99);
    });

    const foundIndex = sorted.findIndex(e => {
      const idClean = e.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const phoneClean = e.phone.replace(/[^0-9]/g, '');
      return idClean.includes(cleanedQuery) || phoneClean.includes(cleanedQuery) || e.ticketNo.toString() === cleanedQuery;
    });

    if (foundIndex === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Entry not found. Please check your reference code or phone number." }));
      return;
    }

    const found = sorted[foundIndex];
    const rank = foundIndex + 1;
    const maskedPhone = found.phone.replace(/(\d{2})\d{6}(\d{2})/, "$1******$2");
    const maskedAddress = found.fullAddress ? found.fullAddress.substring(0, 10) + "******, " + found.city + ", " + found.state : found.city + ", " + found.state;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      found: true,
      entry: {
        id: found.id,
        ticketNo: found.ticketNo,
        rank: rank,
        score: found.score || 5,
        timeTaken: found.timeTaken || 12.5,
        name: found.name,
        maskedPhone,
        maskedAddress,
        city: found.city,
        state: found.state,
        pincode: found.pincode,
        paymentStatus: found.paymentStatus || "VERIFIED",
        timestamp: found.timestamp,
        amount: found.amount || 219,
        utr: found.utr ? found.utr.substring(0, 4) + "****" + found.utr.slice(-4) : "VERIFIED-MOCK",
        targetPrize: rank === 1 ? "🏆 1x Sony PS5 Slim (Disc Edition) + GTA VI" : (rank <= 10 ? `🎮 1x GTA VI Day-One Launch Edition (Rank #${rank})` : "VIP Skill Certificate & Contender Badge")
      }
    }));
    return;
  }

  if (pathname === '/api/enter' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { name, phone, email, fullAddress, city, state, pincode, utr, score, timeTaken } = payload;

        if (!name || !phone || !fullAddress || !city || !state || !pincode) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "All address and contact fields are required." }));
          return;
        }

        const data = readData();

        // Single entry check per phone number
        const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
        const existing = data.entries.find(e => e.phone.replace(/[^0-9]/g, '').slice(-10) === cleanPhone);

        if (existing) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: `Single entry rule enforced! An entry with phone ${phone} already exists with Reference ID: ${existing.id}`,
            existingId: existing.id
          }));
          return;
        }

        // Generate unique Reference Code: GTA6-PS5-XXXXXX
        const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
        const refId = `GTA6-PS5-${randomHex}`;
        const nextTicketNo = 744 + data.entries.length + 1;

        const newEntry = {
          id: refId,
          ticketNo: nextTicketNo,
          name: name.trim(),
          phone: cleanPhone,
          email: (email || '').trim().toLowerCase(),
          fullAddress: fullAddress.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          utr: (utr || 'DEMO-' + Date.now().toString(36).toUpperCase()).trim(),
          amount: 219,
          score: typeof score === 'number' ? score : 5,
          timeTaken: typeof timeTaken === 'number' ? timeTaken : 12.5,
          paymentStatus: "VERIFIED",
          timestamp: new Date().toISOString()
        };

        data.entries.push(newEntry);
        writeData(data);

        // Calculate rank
        const sorted = [...data.entries].sort((a, b) => {
          if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
          return (a.timeTaken || 99) - (b.timeTaken || 99);
        });
        const currentRank = sorted.findIndex(e => e.id === refId) + 1;

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: "Registration and Quiz complete! Your slot is locked.",
          entry: { ...newEntry, rank: currentRank }
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Invalid JSON request payload." }));
      }
    });
    return;
  }

  // Static File Serving
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(__dirname, 'public', safePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        if (!ext || ext === '.html') {
          fs.readFile(path.join(__dirname, 'public', 'index.html'), (err2, fallback) => {
            if (err2) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('404 Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(fallback);
            }
          });
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 File Not Found');
        }
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 GTA VI SPEED CHALLENGE & PS5 CONTEST LIVE!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🎟️ Entry Fee: ₹219 | Legal Game of Skill`);
  console.log(`🏆 Grand Prize: Sony PS5 Slim + 10x GTA VI Launch Editions`);
  console.log(`=================================================\n`);
});
