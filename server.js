// server.js - Server Game Multiplayer Among Us Matematika (Persamaan & Pertidaksamaan Linear)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mathQuestions = require('./mathQuestions');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Game State Management
const rooms = new Map();

// Helper untuk membuat kode room unik 5 huruf
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Warna Crewmate yang tersedia
const AVAILABLE_COLORS = [
  { id: 'red', name: 'Merah', hex: '#c51111' },
  { id: 'blue', name: 'Biru', hex: '#132ed1' },
  { id: 'green', name: 'Hijau', hex: '#117f2d' },
  { id: 'pink', name: 'Merah Muda', hex: '#ed54ba' },
  { id: 'orange', name: 'Oranye', hex: '#ef7d0d' },
  { id: 'yellow', name: 'Kuning', hex: '#f5f557' },
  { id: 'black', name: 'Hitam', hex: '#3f474e' },
  { id: 'white', name: 'Putih', hex: '#d6e0f0' },
  { id: 'purple', name: 'Ungu', hex: '#6b2fbb' },
  { id: 'cyan', name: 'Sian', hex: '#38fedc' },
  { id: 'lime', name: 'Hijau Muda', hex: '#50ef39' },
  { id: 'brown', name: 'Cokelat', hex: '#71491e' }
];

// Definisi Lokasi Task di Kapal Skeld
const MAP_TASKS = [
  { id: 'task_cafeteria', room: 'Cafeteria', name: 'Sambung Kabel Linear', category: 'PLSV', x: 1200, y: 700 },
  { id: 'task_weapons', room: 'Weapons', name: 'Tembak Asteroid Aljabar', category: 'PtLSV', x: 1900, y: 550 },
  { id: 'task_o2', room: 'O2', name: 'Kalibrasi Tabung Oksigen', category: 'Cerita', x: 1600, y: 950 },
  { id: 'task_navigation', room: 'Navigation', name: 'Plot Koordinat Vektor', category: 'SPLDV', x: 2200, y: 1000 },
  { id: 'task_shields', room: 'Shields', name: 'Distribusi Daya Perisai', category: 'NilaiMutlak', x: 1900, y: 1400 },
  { id: 'task_admin', room: 'Admin', name: 'Swipe Kartu Akses SPLDV', category: 'SPLDV', x: 1600, y: 1300 },
  { id: 'task_storage', room: 'Storage', name: 'Isi Bahan Bakar Tangki', category: 'Cerita', x: 1200, y: 1550 },
  { id: 'task_electrical', room: 'Electrical', name: 'Distribusi Arus Listrik', category: 'PLSV', x: 850, y: 1250 },
  { id: 'task_medbay', room: 'MedBay', name: 'Scan Biometrik Pasien', category: 'PtLSV', x: 850, y: 800 },
  { id: 'task_reactor', room: 'Reactor', name: 'Stabilisasi Inti Reaktor', category: 'NilaiMutlak', x: 350, y: 1000 }
];

function createNewRoom(hostSocketId, hostName) {
  let roomCode = generateRoomCode();
  while (rooms.has(roomCode)) {
    roomCode = generateRoomCode();
  }

  const room = {
    code: roomCode,
    hostId: hostSocketId,
    state: 'LOBBY', // LOBBY, PLAYING, EMERGENCY_MEETING, VOTING, IMPOSTOR_TRIAL, EJECTION, GAME_OVER
    settings: {
      maxPlayers: 10,
      impostorCount: 1,
      tasksPerPlayer: 4,
      playerSpeed: 3.5,
      killCooldown: 25,
      emergencyMeetings: 1,
      discussionTime: 15,
      votingTime: 30,
      trialDuration: 40 // detik untuk impostor alibi defense
    },
    players: new Map(),
    deadBodies: [],
    totalTasksCompleted: 0,
    totalTasksNeeded: 0,
    votes: new Map(), // socketId -> votedTargetSocketId ('skip' or playerId)
    meetingCaller: null,
    meetingReason: null,
    meetingTimer: null,
    trialData: null, // Data sesi trial impostor
    sabotage: {
      active: null, // 'lights', 'reactor', 'o2', null
      timer: 0,
      solvedParts: 0
    }
  };

  rooms.set(roomCode, room);
  return room;
}

// Inisialisasi Player
function createPlayer(socketId, name, colorId) {
  return {
    id: socketId,
    name: name || 'Astronot ' + Math.floor(Math.random() * 900 + 100),
    color: colorId || AVAILABLE_COLORS[0].id,
    colorHex: (AVAILABLE_COLORS.find(c => c.id === colorId) || AVAILABLE_COLORS[0]).hex,
    hat: 'none',
    role: 'crewmate', // 'crewmate' atau 'impostor'
    isAlive: true,
    isHost: false,
    x: 1200 + (Math.random() * 100 - 50),
    y: 750 + (Math.random() * 100 - 50),
    vx: 0,
    vy: 0,
    facing: 'right',
    inVent: false,
    killCooldown: 0,
    emergencyMeetingsLeft: 1,
    tasks: [], // list task player
    completedTasksCount: 0,
    isReady: false
  };
}

io.on('connection', (socket) => {
  let currentRoomCode = null;

  // 1. Buat Room
  socket.on('create_room', ({ playerName, color }) => {
    const room = createNewRoom(socket.id, playerName);
    currentRoomCode = room.code;
    socket.join(room.code);

    const player = createPlayer(socket.id, playerName, color || 'red');
    player.isHost = true;
    room.players.set(socket.id, player);

    socket.emit('room_created', {
      roomCode: room.code,
      player,
      settings: room.settings,
      players: Array.from(room.players.values()),
      availableColors: AVAILABLE_COLORS
    });
  });

  // 2. Gabung Room
  socket.on('join_room', ({ roomCode, playerName, color }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms.get(code);

    if (!room) {
      return socket.emit('join_error', { message: `Room dengan kode ${code} tidak ditemukan!` });
    }

    if (room.state !== 'LOBBY') {
      return socket.emit('join_error', { message: 'Permainan di room ini sudah berlangsung!' });
    }

    if (room.players.size >= room.settings.maxPlayers) {
      return socket.emit('join_error', { message: 'Room sudah penuh!' });
    }

    currentRoomCode = code;
    socket.join(code);

    // Cari warna yang belum terpakai jika warna yang dipilih sudah diambil
    const takenColors = new Set(Array.from(room.players.values()).map(p => p.color));
    let assignedColor = color;
    if (!assignedColor || takenColors.has(assignedColor)) {
      const freeColor = AVAILABLE_COLORS.find(c => !takenColors.has(c.id));
      assignedColor = freeColor ? freeColor.id : AVAILABLE_COLORS[0].id;
    }

    const player = createPlayer(socket.id, playerName, assignedColor);
    room.players.set(socket.id, player);

    socket.emit('room_joined', {
      roomCode: code,
      player,
      settings: room.settings,
      players: Array.from(room.players.values()),
      availableColors: AVAILABLE_COLORS
    });

    // Beritahu pemain lain di room
    socket.to(code).emit('player_joined', {
      player,
      players: Array.from(room.players.values())
    });
  });

  // 3. Update Settings
  socket.on('update_settings', (newSettings) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'LOBBY') return;

    room.settings = { ...room.settings, ...newSettings };
    io.to(currentRoomCode).emit('settings_updated', room.settings);
  });

  // 4. Ubah Warna/Kustomisasi
  socket.on('change_color', ({ colorId }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    // Cek ketersediaan warna
    const isTaken = Array.from(room.players.values()).some(p => p.id !== socket.id && p.color === colorId);
    if (isTaken) {
      return socket.emit('color_error', { message: 'Warna tersebut sudah digunakan pemain lain!' });
    }

    const colorObj = AVAILABLE_COLORS.find(c => c.id === colorId);
    if (colorObj) {
      player.color = colorId;
      player.colorHex = colorObj.hex;
      io.to(currentRoomCode).emit('player_updated', { player, players: Array.from(room.players.values()) });
    }
  });

  // 4b. Ubah Nama Pemain di Lobby
  socket.on('change_name', ({ newName }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'LOBBY') return;

    const player = room.players.get(socket.id);
    if (!player) return;

    const cleanName = (newName || '').trim().slice(0, 14);
    if (cleanName) {
      player.name = cleanName;
      io.to(currentRoomCode).emit('player_updated', { player, players: Array.from(room.players.values()) });
    }
  });

  // 5. Start Game
  socket.on('start_game', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'LOBBY') return;

    if (room.players.size < 2) {
      return socket.emit('start_error', { message: 'Dibutuhkan minimal 2 pemain untuk memulai!' });
    }

    // Assign Roles (Impostor vs Crewmate)
    const playerArray = Array.from(room.players.values());
    const shuffled = [...playerArray].sort(() => 0.5 - Math.random());
    const impostorCount = Math.min(room.settings.impostorCount, Math.max(1, Math.floor(playerArray.length / 2)));

    for (let i = 0; i < shuffled.length; i++) {
      const p = room.players.get(shuffled[i].id);
      p.role = i < impostorCount ? 'impostor' : 'crewmate';
      p.isAlive = true;
      p.inVent = false;
      p.killCooldown = room.settings.killCooldown;
      p.emergencyMeetingsLeft = room.settings.emergencyMeetings;

      // Spawn di sekitar meja Cafeteria (lingkaran)
      const angle = (i / shuffled.length) * Math.PI * 2;
      p.x = 1200 + Math.cos(angle) * 140;
      p.y = 750 + Math.sin(angle) * 140;
      p.vx = 0;
      p.vy = 0;

      // Assign Tasks (Soal Persamaan dan Pertidaksamaan Linear yang Berbeda untuk Tiap Pemain)
      p.tasks = [];
      p.completedTasksCount = 0;
      const shuffledTasks = [...MAP_TASKS].sort(() => 0.5 - Math.random()).slice(0, room.settings.tasksPerPlayer);

      shuffledTasks.forEach(taskDef => {
        // Hasilkan soal matematika bervariasi sesuai kategori task
        const question = mathQuestions.getRandomQuestion(taskDef.category);
        p.tasks.push({
          id: taskDef.id + '_' + p.id,
          defId: taskDef.id,
          room: taskDef.room,
          name: taskDef.name,
          category: taskDef.category,
          x: taskDef.x,
          y: taskDef.y,
          completed: false,
          question: question
        });
      });
    }

    // Hitung total task kru
    const crewmates = Array.from(room.players.values()).filter(p => p.role === 'crewmate');
    room.totalTasksNeeded = crewmates.length * room.settings.tasksPerPlayer;
    room.totalTasksCompleted = 0;
    room.deadBodies = [];
    room.state = 'PLAYING';

    // Broadcast Game Started dengan payload terpisah untuk kerahasiaan role & task
    room.players.forEach((p, sId) => {
      const socketClient = io.sockets.sockets.get(sId);
      if (socketClient) {
        socketClient.emit('game_started', {
          self: p,
          players: Array.from(room.players.values()).map(other => ({
            id: other.id,
            name: other.name,
            color: other.color,
            colorHex: other.colorHex,
            isAlive: other.isAlive,
            role: p.role === 'impostor' && other.role === 'impostor' ? 'impostor' : (p.id === other.id ? p.role : 'unknown'),
            x: other.x,
            y: other.y,
            facing: other.facing
          })),
          totalTasksNeeded: room.totalTasksNeeded,
          totalTasksCompleted: room.totalTasksCompleted
        });
      }
    });
  });

  // 6. Player Movement Synchronization (Real-time 60fps interpolation)
  socket.on('player_move', (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'PLAYING') return;

    const player = room.players.get(socket.id);
    if (!player || (!player.isAlive && data.isAlive)) return;

    player.x = data.x;
    player.y = data.y;
    player.vx = data.vx || 0;
    player.vy = data.vy || 0;
    player.facing = data.facing || player.facing;

    socket.to(currentRoomCode).emit('player_moved', {
      id: socket.id,
      x: player.x,
      y: player.y,
      vx: player.vx,
      vy: player.vy,
      facing: player.facing
    });
  });

  // 7. Impostor Kill Crewmate
  socket.on('kill_player', ({ targetId }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'PLAYING') return;

    const killer = room.players.get(socket.id);
    const victim = room.players.get(targetId);

    if (!killer || killer.role !== 'impostor' || !killer.isAlive) return;
    if (!victim || !victim.isAlive) return;

    // Hitung jarak killer ke victim
    const dist = Math.hypot(killer.x - victim.x, killer.y - victim.y);
    if (dist > 150) return; // Jarak kill maks

    // Bunuh victim
    victim.isAlive = false;
    killer.killCooldown = room.settings.killCooldown;

    // Tambah entitas Dead Body di lokasi korban
    const body = {
      id: 'body_' + victim.id + '_' + Date.now(),
      victimId: victim.id,
      victimName: victim.name,
      victimColor: victim.color,
      victimColorHex: victim.colorHex,
      x: victim.x,
      y: victim.y
    };
    room.deadBodies.push(body);

    io.to(currentRoomCode).emit('player_killed', {
      killerId: killer.id,
      victimId: victim.id,
      body: body
    });

    // Cek Kemenangan Impostor (jika jumlah impostor hidup >= crewmate hidup)
    checkWinCondition(room);
  });

  // 8. Impostor Vent
  socket.on('use_vent', ({ ventId, targetX, targetY }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'PLAYING') return;

    const player = room.players.get(socket.id);
    if (!player || player.role !== 'impostor' || !player.isAlive) return;

    player.x = targetX;
    player.y = targetY;
    player.inVent = !player.inVent;

    io.to(currentRoomCode).emit('vent_used', {
      playerId: player.id,
      inVent: player.inVent,
      x: player.x,
      y: player.y
    });
  });

  // 9. Report Dead Body / Emergency Meeting
  socket.on('report_body', ({ bodyId }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'PLAYING') return;

    const reporter = room.players.get(socket.id);
    if (!reporter || !reporter.isAlive) return;

    startMeeting(room, reporter, 'dead_body');
  });

  socket.on('call_emergency', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'PLAYING') return;

    const caller = room.players.get(socket.id);
    if (!caller || !caller.isAlive || caller.emergencyMeetingsLeft <= 0) return;

    caller.emergencyMeetingsLeft--;
    startMeeting(room, caller, 'emergency_button');
  });

  function startMeeting(room, caller, reason) {
    room.state = 'EMERGENCY_MEETING';
    room.meetingCaller = caller.name;
    room.meetingReason = reason;
    room.votes.clear();
    room.deadBodies = []; // Bersihkan mayat saat meeting dimulai

    // Reset posisi semua pemain ke kursi Cafeteria
    const playerArray = Array.from(room.players.values());
    playerArray.forEach((p, idx) => {
      const angle = (idx / playerArray.length) * Math.PI * 2;
      p.x = 1200 + Math.cos(angle) * 160;
      p.y = 750 + Math.sin(angle) * 160;
    });

    io.to(room.code).emit('meeting_started', {
      caller: caller.name,
      reason: reason,
      discussionTime: room.settings.discussionTime,
      votingTime: room.settings.votingTime,
      players: Array.from(room.players.values())
    });

    // Jalankan timer diskusi -> beralih ke voting
    if (room.meetingTimer) clearTimeout(room.meetingTimer);
    room.meetingTimer = setTimeout(() => {
      startVotingPhase(room);
    }, room.settings.discussionTime * 1000);
  }

  function startVotingPhase(room) {
    if (room.state !== 'EMERGENCY_MEETING') return;
    room.state = 'VOTING';

    io.to(room.code).emit('voting_started', {
      votingTime: room.settings.votingTime
    });

    // Jalankan timer voting berakhir
    if (room.meetingTimer) clearTimeout(room.meetingTimer);
    room.meetingTimer = setTimeout(() => {
      tallyVotes(room);
    }, room.settings.votingTime * 1000);
  }

  // 10. Cast Vote
  socket.on('cast_vote', ({ targetId }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'VOTING') return;

    const voter = room.players.get(socket.id);
    if (!voter || !voter.isAlive) return;

    room.votes.set(socket.id, targetId); // targetId bisa 'skip' atau socketId

    io.to(currentRoomCode).emit('player_voted', {
      voterId: socket.id,
      hasVoted: true
    });

    // Cek apakah semua pemain hidup sudah vote
    const alivePlayers = Array.from(room.players.values()).filter(p => p.isAlive);
    if (room.votes.size >= alivePlayers.length) {
      if (room.meetingTimer) clearTimeout(room.meetingTimer);
      tallyVotes(room);
    }
  });

  // 11. Tally Votes & TRIGGER IMPOSTOR ALIBI TRIAL
  function tallyVotes(room) {
    if (room.state !== 'VOTING' && room.state !== 'EMERGENCY_MEETING') return;

    const voteCounts = new Map();
    room.votes.forEach((targetId, voterId) => {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    });

    // Susun laporan vote
    const voteResults = [];
    room.votes.forEach((targetId, voterId) => {
      voteResults.push({ voterId, targetId });
    });

    let maxVotes = 0;
    let candidate = null;
    let isTie = false;

    voteCounts.forEach((count, targetId) => {
      if (count > maxVotes) {
        maxVotes = count;
        candidate = targetId;
        isTie = false;
      } else if (count === maxVotes && maxVotes > 0) {
        isTie = true;
      }
    });

    const aliveCount = Array.from(room.players.values()).filter(p => p.isAlive).length;

    // Skenario 1: Tidak ada vote / Tie / Skip terbanyak
    if (isTie || !candidate || candidate === 'skip' || maxVotes <= 0) {
      io.to(room.code).emit('vote_ended', {
        voteResults,
        ejectedPlayer: null,
        message: 'Tidak ada yang dikeluarkan (Hasil seri atau dilewati).'
      });

      setTimeout(() => {
        resumeGame(room);
      }, 4000);
      return;
    }

    // Skenario 2: Ada kandidat yang dipilih
    const accused = room.players.get(candidate);
    if (!accused) {
      resumeGame(room);
      return;
    }

    // JIKA YANG DI-VOTE ADALAH CREWMATE: Langsung di-eject seperti biasa
    if (accused.role !== 'impostor') {
      accused.isAlive = false;
      const remainingImpostors = Array.from(room.players.values()).filter(p => p.role === 'impostor' && p.isAlive).length;

      io.to(room.code).emit('vote_ended', {
        voteResults,
        ejectedPlayer: {
          id: accused.id,
          name: accused.name,
          color: accused.color,
          role: accused.role
        },
        message: `${accused.name} dikeluarkan ke luar angkasa! (${accused.name} BUKAN Impostor. Sisa ${remainingImpostors} Impostor)`
      });

      setTimeout(() => {
        if (!checkWinCondition(room)) {
          resumeGame(room);
        }
      }, 5000);
      return;
    }

    // JIKA YANG DI-VOTE ADALAH IMPOSTOR:
    // AKTIFKAN FITUR KHUSUS "TRIAL OF INNOCENCE / ALIBI MATEMATIKA" (3 SOAL PERSAMAAN & PERTIDAKSAMAAN LINEAR)!
    startImpostorTrial(room, accused, voteResults);
  }

  // 12. FITUR UTAMA: Sesi Pengadilan Alibi Impostor
  function startImpostorTrial(room, impostor, voteResults) {
    room.state = 'IMPOSTOR_TRIAL';

    // Buat 3 soal matematika linear beragam (PLSV, PtLSV, SPLDV, Nilai Mutlak, Soal Cerita)
    const trialQuestions = mathQuestions.getMultipleDiverseQuestions(3);

    room.trialData = {
      accusedId: impostor.id,
      accusedName: impostor.name,
      questions: trialQuestions,
      currentIndex: 0,
      correctCount: 0,
      totalNeeded: 3,
      duration: room.settings.trialDuration || 40,
      startTime: Date.now()
    };

    // Beritahu SEMUA pemain bahwa Impostor sedang menjalani Sidang Alibi Matematika
    io.to(room.code).emit('start_impostor_trial', {
      accused: {
        id: impostor.id,
        name: impostor.name,
        color: impostor.color,
        colorHex: impostor.colorHex
      },
      voteResults,
      duration: room.trialData.duration,
      totalQuestions: 3
    });

    // Kirim soal pertama KHUSUS ke soket Impostor yang dituduh
    const impostorSocket = io.sockets.sockets.get(impostor.id);
    if (impostorSocket) {
      impostorSocket.emit('trial_receive_question', {
        questionIndex: 0,
        totalQuestions: 3,
        question: trialQuestions[0]
      });
    }

    // Pasang timer batas waktu trial
    if (room.meetingTimer) clearTimeout(room.meetingTimer);
    room.meetingTimer = setTimeout(() => {
      handleTrialTimeout(room);
    }, room.trialData.duration * 1000);
  }

  // Impostor menjawab soal trial
  socket.on('trial_submit_answer', ({ questionIndex, selectedAnswer }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'IMPOSTOR_TRIAL' || !room.trialData) return;
    if (room.trialData.accusedId !== socket.id) return; // hanya terdakwa yang boleh menjawab

    const currentQ = room.trialData.questions[questionIndex];
    if (!currentQ) return;

    const isCorrect = selectedAnswer === currentQ.correctAnswer;

    if (isCorrect) {
      room.trialData.correctCount++;
      room.trialData.currentIndex++;

      // Beritahu progress ke semua pemain di room
      io.to(currentRoomCode).emit('trial_progress_update', {
        accusedName: room.trialData.accusedName,
        currentQuestion: room.trialData.currentIndex,
        correctCount: room.trialData.correctCount,
        totalNeeded: 3,
        status: 'correct'
      });

      // Jika sudah benar 3 dari 3 soal -> IMPOSTOR SELAMAT / ALIBI PROVEN!
      if (room.trialData.correctCount >= 3) {
        if (room.meetingTimer) clearTimeout(room.meetingTimer);
        handleTrialSuccess(room);
        return;
      }

      // Kirim soal berikutnya ke Impostor
      const nextQ = room.trialData.questions[room.trialData.currentIndex];
      socket.emit('trial_receive_question', {
        questionIndex: room.trialData.currentIndex,
        totalQuestions: 3,
        question: nextQ
      });

    } else {
      // SALAH MENJAWAB: Gagal alibi seketika!
      if (room.meetingTimer) clearTimeout(room.meetingTimer);
      handleTrialFailure(room, 'Jawaban salah pada pembuktian alibi aljabar!');
    }
  });

  function handleTrialSuccess(room) {
    const accused = room.players.get(room.trialData.accusedId);
    
    io.to(room.code).emit('trial_result', {
      success: true,
      accusedName: room.trialData.accusedName,
      message: `🎉 ALIBI TERBUKTI SAH! ${room.trialData.accusedName} berhasil memecahkan 3 soal persamaan & pertidaksamaan linear dengan akurasi 100%! Eksekusi vote dibatalkan dan permainan berlanjut!`
    });

    room.trialData = null;
    setTimeout(() => {
      resumeGame(room);
    }, 6000);
  }

  function handleTrialFailure(room, reason) {
    const accused = room.players.get(room.trialData.accusedId);
    if (accused) {
      accused.isAlive = false;
    }

    const remainingImpostors = Array.from(room.players.values()).filter(p => p.role === 'impostor' && p.isAlive).length;

    io.to(room.code).emit('trial_result', {
      success: false,
      accusedName: room.trialData.accusedName,
      message: `💀 ALIBI GAGAL (${reason})! ${room.trialData.accusedName} adalah IMPOSTOR dan langsung dikeluarkan ke luar angkasa! (Sisa ${remainingImpostors} Impostor)`
    });

    room.trialData = null;

    setTimeout(() => {
      if (!checkWinCondition(room)) {
        resumeGame(room);
      }
    }, 6000);
  }

  function handleTrialTimeout(room) {
    if (room.state !== 'IMPOSTOR_TRIAL' || !room.trialData) return;
    handleTrialFailure(room, 'Waktu sidang alibi habis');
  }

  function resumeGame(room) {
    room.state = 'PLAYING';
    room.votes.clear();
    room.meetingCaller = null;
    room.meetingReason = null;

    // Reset kill cooldown untuk semua impostor
    room.players.forEach(p => {
      if (p.role === 'impostor') {
        p.killCooldown = room.settings.killCooldown;
      }
    });

    io.to(room.code).emit('game_resumed', {
      players: Array.from(room.players.values())
    });
  }

  // 13. Pengerjaan Task Matematika oleh Kru
  socket.on('submit_task_answer', ({ taskId, selectedAnswer }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== 'PLAYING') return;

    const player = room.players.get(socket.id);
    if (!player) return;

    const task = player.tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;

    const isCorrect = selectedAnswer === task.question.correctAnswer;

    if (isCorrect) {
      task.completed = true;
      player.completedTasksCount++;
      room.totalTasksCompleted++;

      socket.emit('task_completed_self', {
        taskId: task.id,
        taskName: task.name,
        explanation: task.question.explanation,
        completedCount: player.completedTasksCount,
        totalTasks: player.tasks.length
      });

      io.to(currentRoomCode).emit('task_progress_updated', {
        playerId: player.id,
        totalTasksCompleted: room.totalTasksCompleted,
        totalTasksNeeded: room.totalTasksNeeded
      });

      // Cek apakah seluruh task kru sudah selesai (Kemenangan Kru)
      checkWinCondition(room);
    } else {
      socket.emit('task_wrong_answer', {
        taskId: task.id,
        message: 'Jawaban kurang tepat. Periksa kembali langkah aljabar dan tanda operasinya!'
      });
    }
  });

  // 14. Chat System
  socket.on('send_chat', ({ message }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const sender = room.players.get(socket.id);
    if (!sender) return;

    const cleanMsg = (message || '').trim().slice(0, 150);
    if (!cleanMsg) return;

    const chatPayload = {
      senderId: sender.id,
      senderName: sender.name,
      senderColorHex: sender.colorHex,
      isAlive: sender.isAlive,
      text: cleanMsg,
      timestamp: Date.now()
    };

    if (sender.isAlive) {
      // Pesan dari pemain hidup bisa dibaca semua
      io.to(currentRoomCode).emit('new_chat_message', chatPayload);
    } else {
      // Pesan hantu hanya bisa dibaca sesama hantu
      room.players.forEach((p, sId) => {
        if (!p.isAlive) {
          const ghostSocket = io.sockets.sockets.get(sId);
          if (ghostSocket) ghostSocket.emit('new_chat_message', chatPayload);
        }
      });
    }
  });

  // 15. Cek Kondisi Menang / Kalah
  function checkWinCondition(room) {
    if (room.state === 'GAME_OVER' || room.state === 'LOBBY') return false;

    const aliveCrewmates = Array.from(room.players.values()).filter(p => p.role === 'crewmate' && p.isAlive);
    const aliveImpostors = Array.from(room.players.values()).filter(p => p.role === 'impostor' && p.isAlive);

    // Kemenangan Kru 1: Semua Impostor telah di-eject
    if (aliveImpostors.length === 0) {
      room.state = 'GAME_OVER';
      io.to(room.code).emit('game_over', {
        winner: 'crewmates',
        reason: 'Seluruh Impostor telah dieliminasi dari kapal!',
        players: Array.from(room.players.values())
      });
      return true;
    }

    // Kemenangan Kru 2: Semua Task Matematika telah selesai
    if (room.totalTasksCompleted >= room.totalTasksNeeded && room.totalTasksNeeded > 0) {
      room.state = 'GAME_OVER';
      io.to(room.code).emit('game_over', {
        winner: 'crewmates',
        reason: 'Seluruh tugas matematika kapal telah berhasil diselesaikan oleh kru!',
        players: Array.from(room.players.values())
      });
      return true;
    }

    // Kemenangan Impostor: Jumlah Impostor >= Jumlah Kru
    if (aliveImpostors.length >= aliveCrewmates.length) {
      room.state = 'GAME_OVER';
      io.to(room.code).emit('game_over', {
        winner: 'impostors',
        reason: 'Impostor berhasil menguasai kapal!',
        players: Array.from(room.players.values())
      });
      return true;
    }

    return false;
  }

  // 16. Return to Lobby setelah Game Over
  socket.on('back_to_lobby', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;

    room.state = 'LOBBY';
    room.totalTasksCompleted = 0;
    room.totalTasksNeeded = 0;
    room.deadBodies = [];
    room.votes.clear();

    room.players.forEach(p => {
      p.isAlive = true;
      p.role = 'crewmate';
      p.inVent = false;
      p.tasks = [];
      p.completedTasksCount = 0;
    });

    io.to(currentRoomCode).emit('returned_to_lobby', {
      players: Array.from(room.players.values())
    });
  });

  // 17. Disconnect / Leave
  socket.on('disconnect', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const departingPlayer = room.players.get(socket.id);
    room.players.delete(socket.id);

    if (room.players.size === 0) {
      rooms.delete(currentRoomCode);
    } else {
      // Jika host keluar, alihkan host ke pemain lain
      if (room.hostId === socket.id) {
        const nextHost = room.players.values().next().value;
        if (nextHost) {
          nextHost.isHost = true;
          room.hostId = nextHost.id;
        }
      }

      io.to(currentRoomCode).emit('player_left', {
        playerId: socket.id,
        playerName: departingPlayer ? departingPlayer.name : 'Seorang astronot',
        newHostId: room.hostId,
        players: Array.from(room.players.values())
      });

      if (room.state === 'PLAYING') {
        checkWinCondition(room);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 AMONG US: MATH MULTIPLAYER SERVER BERJALAN!`);
  console.log(`📡 URL Lokal: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
