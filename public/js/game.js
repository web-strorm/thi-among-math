// game.js - Loop Utama Game Canvas 2D & Integrasi Socket.io Client
class GameManager {
  constructor() {
    this.socket = null;
    this.canvas = null;
    this.ctx = null;
    this.map = null;
    this.input = null;

    this.localPlayer = null;
    this.players = new Map();
    this.deadBodies = [];

    this.camera = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    this.lastTime = performance.now();
    this.gameState = 'LOBBY'; // LOBBY, PLAYING, EMERGENCY_MEETING, VOTING, IMPOSTOR_TRIAL, GAME_OVER

    this.interactiveTargets = {
      nearTask: null,
      nearBody: null,
      nearEmergencyTable: false,
      nearVent: null,
      nearVictim: null
    };

    this.init();
  }

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.map = new window.GameMap();
    this.input = new window.InputManager();

    this.setupSocket();
    this.setupActionButtons();

    // Start Game Loop
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.camera.width = window.innerWidth;
    this.camera.height = window.innerHeight;
  }

  setupSocket() {
    this.socket = io();

    // 1. Room Created
    this.socket.on('room_created', (data) => {
      this.localPlayer = new window.Player(data.player);
      this.players.set(data.player.id, this.localPlayer);
      window.uiManager.updateLobbyUI(data.roomCode, data.players, data.player.id, true, data.availableColors);
    });

    // 2. Room Joined
    this.socket.on('room_joined', (data) => {
      this.localPlayer = new window.Player(data.player);
      this.players.set(data.player.id, this.localPlayer);
      window.uiManager.updateLobbyUI(data.roomCode, data.players, data.player.id, false, data.availableColors);
    });

    // 3. Player Joined / Left / Updated
    this.socket.on('player_joined', (data) => {
      window.uiManager.updateLobbyUI(data.player.roomCode || '', data.players, this.localPlayer.id, this.localPlayer.isHost, null);
    });

    this.socket.on('player_updated', (data) => {
      if (data.player.id === this.localPlayer.id) {
        this.localPlayer.name = data.player.name;
        this.localPlayer.color = data.player.color;
        this.localPlayer.colorHex = data.player.colorHex;
      }
      window.uiManager.updateLobbyUI('', data.players, this.localPlayer.id, this.localPlayer.isHost, null);
    });

    this.socket.on('player_left', (data) => {
      this.players.delete(data.playerId);
      if (data.newHostId === this.localPlayer?.id) {
        this.localPlayer.isHost = true;
      }
      window.uiManager.updateLobbyUI('', data.players, this.localPlayer?.id, this.localPlayer?.isHost, null);
    });

    // 4. Game Started
    this.socket.on('game_started', (data) => {
      this.gameState = 'PLAYING';
      window.uiManager.showScreen('game');

      this.localPlayer = new window.Player(data.self);
      this.players.clear();
      this.deadBodies = [];

      data.players.forEach(pData => {
        const p = new window.Player(pData);
        this.players.set(p.id, p);
      });

      // Tampilkan Banner Peran (Crewmate vs Impostor)
      const roleBanner = document.getElementById('role-reveal-banner');
      if (roleBanner) {
        roleBanner.style.display = 'flex';
        const isImp = this.localPlayer.role === 'impostor';
        roleBanner.className = `role-reveal ${isImp ? 'impostor' : 'crewmate'}`;
        roleBanner.innerHTML = `
          <h1>${isImp ? 'IMPOSTOR' : 'CREWMATE'}</h1>
          <p>${isImp ? 'Sabotase kapal, manfaatkan ventilasi, dan singkirkan para kru!' : 'Selesaikan seluruh tugas persamaan & pertidaksamaan linear kapal!'}</p>
        `;
        setTimeout(() => {
          roleBanner.style.display = 'none';
        }, 4000);
      }

      window.uiManager.updateTaskProgress(data.totalTasksCompleted, data.totalTasksNeeded);
      window.uiManager.updateTaskList(this.localPlayer.tasks);
      this.updateHUDVisibility();
    });

    // 5. Gerakan Pemain Lain
    this.socket.on('player_moved', (data) => {
      const p = this.players.get(data.id);
      if (p && p.id !== this.localPlayer?.id) {
        p.targetX = data.x;
        p.targetY = data.y;
        p.vx = data.vx;
        p.vy = data.vy;
        p.facing = data.facing;
      }
    });

    // 6. Kill Event
    this.socket.on('player_killed', (data) => {
      window.soundEngine.playKill();
      const victim = this.players.get(data.victimId);
      if (victim) {
        victim.isAlive = false;
      }
      if (this.localPlayer.id === data.victimId) {
        this.localPlayer.isAlive = false;
        // Efek mati lokal
      }
      this.deadBodies.push(data.body);
    });

    // 7. Vent Event
    this.socket.on('vent_used', (data) => {
      window.soundEngine.playVent();
      const p = this.players.get(data.playerId);
      if (p) {
        p.inVent = data.inVent;
        p.x = data.x;
        p.y = data.y;
      }
    });

    // 8. Meeting & Voting
    this.socket.on('meeting_started', (data) => {
      this.gameState = 'EMERGENCY_MEETING';
      this.deadBodies = [];
      data.players.forEach(pData => {
        const p = this.players.get(pData.id);
        if (p) {
          p.x = pData.x;
          p.y = pData.y;
          p.isAlive = pData.isAlive;
        }
      });
      window.uiManager.showMeetingModal(data.caller, data.reason, data.discussionTime, data.votingTime, data.players, this.localPlayer.id);
    });

    this.socket.on('voting_started', (data) => {
      this.gameState = 'VOTING';
      window.uiManager.setVotingActive(data.votingTime);
    });

    this.socket.on('vote_ended', (data) => {
      window.uiManager.showVoteResults(data.voteResults, data.message);
    });

    // 9. FITUR UTAMA: SIDANG ALIBI IMPOSTOR (TRIAL OF INNOCENCE)
    this.socket.on('start_impostor_trial', (data) => {
      this.gameState = 'IMPOSTOR_TRIAL';
      const isAccusedSelf = data.accused.id === this.localPlayer.id;
      window.uiManager.showImpostorTrialModal(data.accused, data.duration, isAccusedSelf);
    });

    this.socket.on('trial_receive_question', (data) => {
      window.uiManager.setTrialQuestion(data.questionIndex, data.totalQuestions, data.question);
    });

    this.socket.on('trial_progress_update', (data) => {
      window.uiManager.updateTrialSpectatorProgress(data.accusedName, data.correctCount, data.totalNeeded);
    });

    this.socket.on('trial_result', (data) => {
      window.uiManager.showTrialVerdict(data.success, data.message);
    });

    // 10. Resumed Game
    this.socket.on('game_resumed', (data) => {
      this.gameState = 'PLAYING';
      window.uiManager.hideMeetingModal();
      if (this.localPlayer.role === 'impostor') {
        this.localPlayer.killCooldown = 25;
      }
    });

    // 11. Task Events
    this.socket.on('task_completed_self', (data) => {
      window.uiManager.showTaskFeedback(true, data.explanation);
      const t = this.localPlayer.tasks.find(x => x.id === data.taskId);
      if (t) t.completed = true;
      window.uiManager.updateTaskList(this.localPlayer.tasks);
    });

    this.socket.on('task_wrong_answer', (data) => {
      window.uiManager.showTaskFeedback(false, data.message);
    });

    this.socket.on('task_progress_updated', (data) => {
      window.uiManager.updateTaskProgress(data.totalTasksCompleted, data.totalTasksNeeded);
    });

    // 12. Chat
    this.socket.on('new_chat_message', (data) => {
      window.uiManager.addChatMessage(data.senderName, data.senderColorHex, data.text, !data.isAlive);
    });

    // 13. Game Over
    this.socket.on('game_over', (data) => {
      this.gameState = 'GAME_OVER';
      window.uiManager.showGameOverModal(data.winner, data.reason, data.players);
    });
  }

  // Aksi Buat & Gabung Room
  createRoom(playerName) {
    this.socket.emit('create_room', { playerName, color: 'red' });
  }

  joinRoom(roomCode, playerName) {
    this.socket.emit('join_room', { roomCode, playerName, color: 'blue' });
  }

  startGame() {
    this.socket.emit('start_game');
  }

  changeColor(colorId) {
    this.socket.emit('change_color', { colorId });
  }

  changeName(newName) {
    this.socket.emit('change_name', { newName });
  }

  castVote(targetId) {
    this.socket.emit('cast_vote', { targetId });
  }

  submitTaskAnswer(taskId, selectedAnswer) {
    this.socket.emit('submit_task_answer', { taskId, selectedAnswer });
  }

  submitTrialAnswer(questionIndex, selectedAnswer) {
    this.socket.emit('trial_submit_answer', { questionIndex, selectedAnswer });
  }

  sendChat(message) {
    this.socket.emit('send_chat', { message });
  }

  // Setup Tombol Aksi di Layar HUD
  setupActionButtons() {
    const btnUse = document.getElementById('action-btn-use');
    const btnKill = document.getElementById('action-btn-kill');
    const btnReport = document.getElementById('action-btn-report');
    const btnVent = document.getElementById('action-btn-vent');

    if (btnUse) btnUse.addEventListener('click', () => this.handlePlayerAction('use'));
    if (btnKill) btnKill.addEventListener('click', () => this.handlePlayerAction('kill'));
    if (btnReport) btnReport.addEventListener('click', () => this.handlePlayerAction('report'));
    if (btnVent) btnVent.addEventListener('click', () => this.handlePlayerAction('vent'));
  }

  updateHUDVisibility() {
    const isImp = this.localPlayer?.role === 'impostor';
    const btnKill = document.getElementById('action-btn-kill');
    const btnVent = document.getElementById('action-btn-vent');

    if (btnKill) btnKill.style.display = isImp ? 'flex' : 'none';
    if (btnVent) btnVent.style.display = isImp ? 'flex' : 'none';
  }

  // Handler Tombol Aksi & Hotkey (USE, KILL, REPORT, VENT)
  handlePlayerAction(type) {
    if (this.gameState !== 'PLAYING' || !this.localPlayer) return;

    if (type === 'use') {
      if (this.interactiveTargets.nearEmergencyTable && this.localPlayer.isAlive) {
        window.soundEngine.playClick();
        this.socket.emit('call_emergency');
      } else if (this.interactiveTargets.nearTask && this.localPlayer.isAlive) {
        const task = this.interactiveTargets.nearTask;
        if (!task.completed) {
          window.uiManager.showTaskModal(task);
        }
      }
    } else if (type === 'report') {
      if (this.interactiveTargets.nearBody && this.localPlayer.isAlive) {
        window.soundEngine.playClick();
        this.socket.emit('report_body', { bodyId: this.interactiveTargets.nearBody.id });
      }
    } else if (type === 'kill') {
      if (this.localPlayer.role === 'impostor' && this.localPlayer.isAlive && this.localPlayer.killCooldown <= 0 && this.interactiveTargets.nearVictim) {
        this.socket.emit('kill_player', { targetId: this.interactiveTargets.nearVictim.id });
      }
    } else if (type === 'vent') {
      if (this.localPlayer.role === 'impostor' && this.localPlayer.isAlive && this.interactiveTargets.nearVent) {
        const vent = this.interactiveTargets.nearVent;
        // Pindah ke vent berikutnya di jaringan
        const connId = vent.connectedTo[0];
        const destVent = this.map.vents.find(v => v.id === connId) || vent;
        this.socket.emit('use_vent', { ventId: vent.id, targetX: destVent.x, targetY: destVent.y });
      }
    }
  }

  // Game Loop 60 FPS
  gameLoop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    if (this.gameState !== 'PLAYING' || !this.localPlayer) return;

    // 1. Update Kill Cooldown Impostor
    if (this.localPlayer.role === 'impostor' && this.localPlayer.killCooldown > 0) {
      this.localPlayer.killCooldown = Math.max(0, this.localPlayer.killCooldown - dt);
      const killTimerEl = document.getElementById('kill-cooldown-timer');
      if (killTimerEl) {
        killTimerEl.innerText = this.localPlayer.killCooldown > 0 ? Math.ceil(this.localPlayer.killCooldown) : '';
      }
    }

    // 2. Kontrol Gerakan Pemain Lokal
    const moveVec = this.input.getMovementVector();
    const speed = this.localPlayer.isAlive ? 220 : 320; // Hantu berjalan lebih cepat

    let newVx = moveVec.vx * speed;
    let newVy = moveVec.vy * speed;

    let nextX = this.localPlayer.x + newVx * dt;
    let nextY = this.localPlayer.y + newVy * dt;

    // Deteksi Collision jika hidup (Hantu bisa menembus dinding)
    if (this.localPlayer.isAlive) {
      if (!this.map.checkCollision(nextX, this.localPlayer.y, this.localPlayer.radius)) {
        this.localPlayer.x = nextX;
      }
      if (!this.map.checkCollision(this.localPlayer.x, nextY, this.localPlayer.radius)) {
        this.localPlayer.y = nextY;
      }
    } else {
      this.localPlayer.x = nextX;
      this.localPlayer.y = nextY;
    }

    this.localPlayer.vx = newVx;
    this.localPlayer.vy = newVy;
    this.localPlayer.update(dt);

    // Kirim sinkronisasi posisi ke Server
    this.socket.emit('player_move', {
      x: this.localPlayer.x,
      y: this.localPlayer.y,
      vx: this.localPlayer.vx,
      vy: this.localPlayer.vy,
      facing: this.localPlayer.facing,
      isAlive: this.localPlayer.isAlive
    });

    // Update Pemain Lain
    this.players.forEach(p => {
      if (p.id !== this.localPlayer.id) {
        p.update(dt);
      }
    });

    // 3. Deteksi Kedekatan Interaktif (Proximity Triggers)
    this.checkProximityTriggers();

    // 4. Update Kamera
    this.camera.x = this.localPlayer.x - this.camera.width / 2;
    this.camera.y = this.localPlayer.y - this.camera.height / 2;
  }

  checkProximityTriggers() {
    const px = this.localPlayer.x;
    const py = this.localPlayer.y;

    // A. Cek Dekat Meja Emergency
    const distToTable = Math.hypot(px - this.map.emergencyTable.x, py - this.map.emergencyTable.y);
    this.interactiveTargets.nearEmergencyTable = distToTable < 120;

    // B. Cek Dekat Task Station
    this.interactiveTargets.nearTask = null;
    if (this.localPlayer.tasks) {
      for (const t of this.localPlayer.tasks) {
        const dist = Math.hypot(px - t.x, py - t.y);
        if (dist < 80) {
          this.interactiveTargets.nearTask = t;
          break;
        }
      }
    }

    // C. Cek Dekat Mayat (Dead Body)
    this.interactiveTargets.nearBody = null;
    for (const b of this.deadBodies) {
      const dist = Math.hypot(px - b.x, py - b.y);
      if (dist < 110) {
        this.interactiveTargets.nearBody = b;
        break;
      }
    }

    // D. Cek Dekat Korban Kru (Khusus Impostor)
    this.interactiveTargets.nearVictim = null;
    if (this.localPlayer.role === 'impostor' && this.localPlayer.isAlive) {
      let closestDist = 130;
      this.players.forEach(p => {
        if (p.id !== this.localPlayer.id && p.role !== 'impostor' && p.isAlive) {
          const dist = Math.hypot(px - p.x, py - p.y);
          if (dist < closestDist) {
            closestDist = dist;
            this.interactiveTargets.nearVictim = p;
          }
        }
      });
    }

    // E. Cek Dekat Vent (Khusus Impostor)
    this.interactiveTargets.nearVent = null;
    if (this.localPlayer.role === 'impostor' && this.localPlayer.isAlive) {
      for (const v of this.map.vents) {
        const dist = Math.hypot(px - v.x, py - v.y);
        if (dist < 80) {
          this.interactiveTargets.nearVent = v;
          break;
        }
      }
    }

    // Update Status Tombol di UI
    const btnUse = document.getElementById('action-btn-use');
    const btnReport = document.getElementById('action-btn-report');
    const btnKill = document.getElementById('action-btn-kill');
    const btnVent = document.getElementById('action-btn-vent');

    if (btnUse) {
      btnUse.disabled = !(this.interactiveTargets.nearTask || this.interactiveTargets.nearEmergencyTable);
    }
    if (btnReport) {
      btnReport.disabled = !this.interactiveTargets.nearBody;
    }
    if (btnKill) {
      btnKill.disabled = !(this.interactiveTargets.nearVictim && this.localPlayer.killCooldown <= 0);
    }
    if (btnVent) {
      btnVent.disabled = !this.interactiveTargets.nearVent;
    }
  }

  render() {
    if (!this.ctx || !this.localPlayer) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    // Geser Canvas sesuai Koordinat Kamera
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Gambar Peta Kapal
    this.map.draw(this.ctx, this.camera);

    // 2. Gambar Mayat (Dead Bodies)
    this.deadBodies.forEach(b => {
      window.Player.drawDeadBody(this.ctx, b);
    });

    // 3. Gambar Semua Pemain (Urutkan berdasarkan koordinat Y untuk depth sorting yang tepat)
    const renderList = Array.from(this.players.values());
    renderList.sort((a, b) => a.y - b.y);

    renderList.forEach(p => {
      const isLocal = p.id === this.localPlayer.id;
      p.draw(this.ctx, isLocal, this.localPlayer.role, this.localPlayer.isAlive);
    });

    // 4. Efek Fog of War / Lingkaran Penglihatan Cahaya (Lighting & Shadow)
    if (this.localPlayer.isAlive) {
      this.drawLightingMask();
    }

    this.ctx.restore();
  }

  // Menggambar Lingkaran Penglihatan Senter Astronot (Fog of War)
  drawLightingMask() {
    const px = this.localPlayer.x;
    const py = this.localPlayer.y;
    // Impostor memiliki jarak pandang lebih luas di dalam kegelapan kapal
    const visionRadius = this.localPlayer.role === 'impostor' ? 380 : 270;

    const grad = this.ctx.createRadialGradient(px, py, visionRadius * 0.5, px, py, visionRadius);
    grad.addColorStop(0, 'rgba(5, 8, 15, 0)');
    grad.addColorStop(0.8, 'rgba(5, 8, 15, 0.4)');
    grad.addColorStop(1, 'rgba(5, 8, 15, 0.95)');

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(this.camera.x, this.camera.y, this.camera.width, this.camera.height);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new GameManager();
});
