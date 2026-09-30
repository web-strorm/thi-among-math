// ui-manager.js - Pengelola Antarmuka UI, Dialog Task Matematika, Voting & Impostor Alibi Trial
class UIManager {
  constructor() {
    this.currentScreen = 'lobby';
    this.activeTask = null;
    this.trialTimerInterval = null;
    this.meetingTimerInterval = null;
    this.bindEvents();
  }

  bindEvents() {
    // Tombol Buat Room
    const btnCreate = document.getElementById('btn-create-room');
    if (btnCreate) {
      btnCreate.addEventListener('click', () => {
        window.soundEngine.init();
        window.soundEngine.playClick();
        const name = document.getElementById('player-name-input').value.trim() || 'Astronot';
        window.game.createRoom(name);
      });
    }

    // Tombol Gabung Room
    const btnJoin = document.getElementById('btn-join-room');
    if (btnJoin) {
      btnJoin.addEventListener('click', () => {
        window.soundEngine.init();
        window.soundEngine.playClick();
        const name = document.getElementById('player-name-input').value.trim() || 'Astronot';
        const code = document.getElementById('room-code-input').value.trim().toUpperCase();
        if (!code) {
          alert('Masukkan kode room!');
          return;
        }
        window.game.joinRoom(code, name);
      });
    }

    // Input Ganti Nama Kapan Saja di Lobby Sebelum Game Dimulai
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val && window.game && window.game.localPlayer) {
          window.game.changeName(val);
        }
      });
    }

    // Tombol Mulai Game (Host Only)
    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        window.soundEngine.playClick();
        window.game.startGame();
      });
    }

    // Tombol Suara Mute/Unmute
    const btnSound = document.getElementById('btn-sound-toggle');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        window.soundEngine.init();
        const isMuted = window.soundEngine.toggleMute();
        btnSound.innerText = isMuted ? '🔇' : '🔊';
      });
    }

    // Tombol Chat Kirim
    const btnSendChat = document.getElementById('btn-send-chat');
    const chatInput = document.getElementById('chat-input');
    if (btnSendChat && chatInput) {
      const sendAction = () => {
        const text = chatInput.value.trim();
        if (text) {
          window.game.sendChat(text);
          chatInput.value = '';
        }
      };
      btnSendChat.addEventListener('click', sendAction);
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          sendAction();
        }
      });
    }

    // Tombol Tutup Task Modal
    const btnCloseTask = document.getElementById('btn-close-task');
    if (btnCloseTask) {
      btnCloseTask.addEventListener('click', () => {
        this.hideTaskModal();
      });
    }

    // Inisialisasi Scratchpad Tools
    const btnPen = document.getElementById('scratch-tool-pen');
    const btnEraser = document.getElementById('scratch-tool-eraser');
    const btnClear = document.getElementById('scratch-tool-clear');
    if (btnPen && btnEraser && btnClear) {
      btnPen.addEventListener('click', () => {
        window.mathRenderer.setTool('#ffff00');
        btnPen.classList.add('active');
        btnEraser.classList.remove('active');
      });
      btnEraser.addEventListener('click', () => {
        window.mathRenderer.setTool('eraser');
        btnEraser.classList.add('active');
        btnPen.classList.remove('active');
      });
      btnClear.addEventListener('click', () => {
        window.mathRenderer.clearScratchpad();
      });
    }
  }

  // Menampilkan Layar Tertentu (Lobby vs Game)
  showScreen(screen) {
    this.currentScreen = screen;
    document.getElementById('lobby-screen').style.display = screen === 'lobby' ? 'flex' : 'none';
    document.getElementById('game-container').style.display = screen === 'game' ? 'block' : 'none';
  }

  // Update Tampilan Room Lobby
  updateLobbyUI(roomCode, players, selfId, isHost, availableColors) {
    document.getElementById('display-room-code').innerText = roomCode;
    document.getElementById('lobby-player-count').innerText = `${players.length}/10`;

    // Tombol Start hanya aktif untuk Host dengan minimal 2 pemain
    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) {
      btnStart.style.display = isHost ? 'block' : 'none';
      btnStart.disabled = players.length < 2;
      btnStart.innerText = players.length < 2 ? 'MENUNGGU PEMAIN LAIN (MIN 2)...' : '🚀 MULAI GAME';
    }

    // Render Daftar Pemain di Lobby
    const playerListDiv = document.getElementById('lobby-player-grid');
    if (playerListDiv) {
      playerListDiv.innerHTML = '';
      players.forEach(p => {
        const card = document.createElement('div');
        card.className = `player-card ${p.id === selfId ? 'self-card' : ''}`;
        card.innerHTML = `
          <div class="player-avatar-preview" style="background-color: ${p.colorHex};">
            <div class="mini-visor"></div>
          </div>
          <div class="player-info">
            <span class="player-name">${p.name} ${p.isHost ? '👑' : ''}</span>
            <span class="player-badge">${p.id === selfId ? '(Kamu)' : 'Pemain'}</span>
          </div>
        `;
        playerListDiv.appendChild(card);
      });
    }

    // Render Pilihan Warna
    const colorGrid = document.getElementById('color-picker-grid');
    if (colorGrid && availableColors) {
      colorGrid.innerHTML = '';
      const takenColors = new Set(players.filter(p => p.id !== selfId).map(p => p.color));

      availableColors.forEach(col => {
        const colBtn = document.createElement('div');
        const isTaken = takenColors.has(col.id);
        const isCurrent = players.find(p => p.id === selfId)?.color === col.id;

        colBtn.className = `color-circle ${isTaken ? 'taken' : ''} ${isCurrent ? 'selected' : ''}`;
        colBtn.style.backgroundColor = col.hex;
        colBtn.title = col.name;

        if (!isTaken) {
          colBtn.addEventListener('click', () => {
            window.soundEngine.playClick();
            window.game.changeColor(col.id);
          });
        }
        colorGrid.appendChild(colBtn);
      });
    }
  }

  // Update Task Progress Bar Utama Kru
  updateTaskProgress(completed, total) {
    const percent = total > 0 ? Math.min(100, (completed / total) * 100) : 0;
    const bar = document.getElementById('total-task-bar-fill');
    const label = document.getElementById('total-task-bar-text');

    if (bar) bar.style.width = `${percent}%`;
    if (label) label.innerText = `Total Tugas Matematika Kru: ${completed}/${total} (${Math.round(percent)}%)`;
  }

  // Update Checklist Tugas Pemain Lokal
  updateTaskList(tasks) {
    const listEl = document.getElementById('player-task-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    tasks.forEach(t => {
      const item = document.createElement('div');
      item.className = `task-item ${t.completed ? 'completed' : ''}`;
      item.innerHTML = `
        <span class="task-check">${t.completed ? '✅' : '🟡'}</span>
        <span class="task-text">${t.name} <small>(${t.room})</small></span>
      `;
      listEl.appendChild(item);
    });
  }

  // Menampilkan Dialog Soal Task Matematika (Crewmate)
  showTaskModal(task) {
    this.activeTask = task;
    const modal = document.getElementById('task-modal');
    if (!modal) return;

    window.soundEngine.playClick();
    document.getElementById('task-modal-title').innerText = `${task.name} (${task.room})`;
    document.getElementById('task-category-badge').innerText = `Materi: ${task.question.category}`;

    // Render Formula Matematika
    const promptContainer = document.getElementById('task-math-prompt');
    promptContainer.innerHTML = window.mathRenderer.formatMathHTML(task.question.prompt);

    // Render 4 Opsi Jawaban
    const optionsContainer = document.getElementById('task-options-grid');
    optionsContainer.innerHTML = '';

    task.question.options.forEach((optText, index) => {
      const btn = document.createElement('button');
      btn.className = 'math-option-btn';
      btn.innerHTML = `<span class="opt-letter">${String.fromCharCode(65 + index)}.</span> <span class="opt-content">${window.mathRenderer.formatMathHTML(optText)}</span>`;

      btn.addEventListener('click', () => {
        btn.classList.add('selected');
        window.game.submitTaskAnswer(task.id, optText);
      });
      optionsContainer.appendChild(btn);
    });

    // Reset dan inisialisasi Scratchpad
    window.mathRenderer.initScratchpad('scratchpad-canvas');
    document.getElementById('task-feedback-msg').style.display = 'none';

    modal.style.display = 'flex';
  }

  hideTaskModal() {
    this.activeTask = null;
    const modal = document.getElementById('task-modal');
    if (modal) modal.style.display = 'none';
  }

  showTaskFeedback(isSuccess, explanation) {
    const feedbackEl = document.getElementById('task-feedback-msg');
    if (!feedbackEl) return;

    feedbackEl.style.display = 'block';
    if (isSuccess) {
      window.soundEngine.playTaskComplete();
      feedbackEl.className = 'task-feedback-box success';
      feedbackEl.innerHTML = `<strong>🎉 BENAR & TUGAS SELESAI!</strong><br><small>${explanation.replace(/\n/g, '<br>')}</small>`;
      setTimeout(() => {
        this.hideTaskModal();
      }, 2500);
    } else {
      window.soundEngine.playWrongAnswer();
      feedbackEl.className = 'task-feedback-box error';
      feedbackEl.innerHTML = `<strong>❌ JAWABAN KURANG TEPAT!</strong><br><small>Periksa kembali langkah penyelesaian dan tanda operasinya.</small>`;
    }
  }

  // Menampilkan Layar Emergency Meeting & Voting
  showMeetingModal(caller, reason, discTime, voteTime, players, selfId) {
    this.hideTaskModal();
    window.soundEngine.playEmergency();

    const modal = document.getElementById('meeting-modal');
    if (!modal) return;

    document.getElementById('meeting-caller-name').innerText = caller;
    document.getElementById('meeting-reason-badge').innerText = reason === 'dead_body' ? '🚨 MAYAT DILAPORKAN!' : '⚠️ EMERGENCY MEETING DIPANGGIL!';

    const timerEl = document.getElementById('meeting-timer-count');
    let timeLeft = discTime;
    timerEl.innerText = `Waktu Diskusi: ${timeLeft}s`;

    if (this.meetingTimerInterval) clearInterval(this.meetingTimerInterval);
    this.meetingTimerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        timerEl.innerText = `Waktu Diskusi: ${timeLeft}s`;
      } else {
        clearInterval(this.meetingTimerInterval);
        timerEl.innerText = '🗳️ WAKTU VOTING DIMULAI!';
      }
    }, 1000);

    // Render Kartu Pemain untuk Voting
    const grid = document.getElementById('meeting-players-grid');
    grid.innerHTML = '';

    players.forEach(p => {
      const card = document.createElement('div');
      card.className = `meeting-player-card ${!p.isAlive ? 'dead' : ''} ${p.id === selfId ? 'is-self' : ''}`;
      card.id = `vote-card-${p.id}`;

      card.innerHTML = `
        <div class="card-avatar" style="background-color: ${p.colorHex};">
          ${!p.isAlive ? '<span class="dead-cross">❌</span>' : ''}
        </div>
        <div class="card-name">${p.name} ${p.id === selfId ? '(Kamu)' : ''}</div>
        <div class="card-status">${p.isAlive ? 'Hidup' : 'Mati'}</div>
        <div class="vote-badges-container" id="vote-badges-${p.id}"></div>
        ${p.isAlive && p.id !== selfId ? `<button class="btn-cast-vote" data-id="${p.id}">VOTE</button>` : ''}
      `;

      const btnVote = card.querySelector('.btn-cast-vote');
      if (btnVote) {
        btnVote.addEventListener('click', () => {
          window.soundEngine.playClick();
          window.game.castVote(p.id);
          document.querySelectorAll('.btn-cast-vote').forEach(b => b.disabled = true);
          document.getElementById('btn-skip-vote').disabled = true;
        });
      }

      grid.appendChild(card);
    });

    const btnSkip = document.getElementById('btn-skip-vote');
    if (btnSkip) {
      btnSkip.disabled = false;
      btnSkip.onclick = () => {
        window.soundEngine.playClick();
        window.game.castVote('skip');
        document.querySelectorAll('.btn-cast-vote').forEach(b => b.disabled = true);
        btnSkip.disabled = true;
      };
    }

    modal.style.display = 'flex';
  }

  // Update Status Voting Dimulai
  setVotingActive(voteTime) {
    const timerEl = document.getElementById('meeting-timer-count');
    let timeLeft = voteTime;
    timerEl.innerText = `Waktu Voting: ${timeLeft}s`;

    if (this.meetingTimerInterval) clearInterval(this.meetingTimerInterval);
    this.meetingTimerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft >= 0) {
        timerEl.innerText = `Waktu Voting: ${timeLeft}s`;
      } else {
        clearInterval(this.meetingTimerInterval);
      }
    }, 1000);
  }

  // Tampilkan Hasil Tally Voting
  showVoteResults(voteResults, message) {
    if (this.meetingTimerInterval) clearInterval(this.meetingTimerInterval);

    // Tampilkan siapa vote siapa
    voteResults.forEach(v => {
      const badgeHolder = document.getElementById(`vote-badges-${v.targetId}`);
      if (badgeHolder) {
        const badge = document.createElement('span');
        badge.className = 'vote-mini-badge';
        badge.innerText = '🗳️';
        badgeHolder.appendChild(badge);
      }
    });

    const banner = document.getElementById('vote-result-banner');
    if (banner) {
      banner.style.display = 'block';
      banner.innerHTML = `<h3>${message}</h3>`;
    }
  }

  hideMeetingModal() {
    const modal = document.getElementById('meeting-modal');
    if (modal) modal.style.display = 'none';
    const banner = document.getElementById('vote-result-banner');
    if (banner) banner.style.display = 'none';
  }

  // ============================================================
  // FITUR UTAMA: MODAL TRIAL OF INNOCENCE / ALIBI MATEMATIKA IMPOSTOR
  // ============================================================
  showImpostorTrialModal(accused, duration, isAccusedSelf) {
    this.hideMeetingModal();
    window.soundEngine.playEmergency();

    const modal = document.getElementById('impostor-trial-modal');
    if (!modal) return;

    document.getElementById('trial-accused-name').innerText = accused.name;
    document.getElementById('trial-accused-avatar').style.backgroundColor = accused.colorHex;

    const timerBar = document.getElementById('trial-timer-bar-fill');
    const timerText = document.getElementById('trial-timer-text');
    let timeLeft = duration;

    timerText.innerText = `Sisa Waktu Sidang: ${timeLeft}s`;
    timerBar.style.width = '100%';

    if (this.trialTimerInterval) clearInterval(this.trialTimerInterval);
    this.trialTimerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft >= 0) {
        timerText.innerText = `Sisa Waktu Sidang: ${timeLeft}s`;
        timerBar.style.width = `${(timeLeft / duration) * 100}%`;
        window.soundEngine.playTrialBeep(timeLeft <= 10);
      } else {
        clearInterval(this.trialTimerInterval);
      }
    }, 1000);

    // Atur Tampilan: Apakah Pemain adalah Terdakwa (Impostor) atau Penonton (Crewmates)
    const activeChallengeDiv = document.getElementById('trial-active-challenge');
    const spectatorDiv = document.getElementById('trial-spectator-view');

    if (isAccusedSelf) {
      // Impostor Aktif Mengerjakan
      activeChallengeDiv.style.display = 'block';
      spectatorDiv.style.display = 'none';
      window.mathRenderer.initScratchpad('trial-scratchpad-canvas');
    } else {
      // Kru Menonton Live
      activeChallengeDiv.style.display = 'none';
      spectatorDiv.style.display = 'block';
      document.getElementById('spectator-status-msg').innerText = `${accused.name} sedang membuktikan alibi matematika...`;
    }

    this.updateTrialStepBadges(0, 3);
    document.getElementById('trial-verdict-box').style.display = 'none';

    modal.style.display = 'flex';
  }

  // Update Soal yang Diterima Impostor Saat Trial
  setTrialQuestion(questionIndex, totalQuestions, question) {
    this.updateTrialStepBadges(questionIndex, totalQuestions);

    document.getElementById('trial-question-category').innerText = `Soal ${questionIndex + 1}/${totalQuestions}: ${question.category}`;
    const promptDiv = document.getElementById('trial-question-prompt');
    promptDiv.innerHTML = window.mathRenderer.formatMathHTML(question.prompt);

    const optionsGrid = document.getElementById('trial-options-grid');
    optionsGrid.innerHTML = '';

    question.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'math-option-btn trial-opt-btn';
      btn.innerHTML = `<span class="opt-letter">${String.fromCharCode(65 + idx)}.</span> <span class="opt-content">${window.mathRenderer.formatMathHTML(optText)}</span>`;

      btn.addEventListener('click', () => {
        btn.classList.add('selected');
        window.game.submitTrialAnswer(questionIndex, optText);
      });
      optionsGrid.appendChild(btn);
    });

    window.mathRenderer.clearScratchpad();
  }

  // Update Indikator Soal 1/3, 2/3, 3/3
  updateTrialStepBadges(currentIndex, totalQuestions) {
    const badges = document.querySelectorAll('.trial-step-badge');
    badges.forEach((b, idx) => {
      b.className = 'trial-step-badge';
      if (idx < currentIndex) {
        b.classList.add('completed');
        b.innerHTML = `✓ Soal ${idx + 1}`;
      } else if (idx === currentIndex) {
        b.classList.add('active');
        b.innerHTML = `🔥 Soal ${idx + 1}`;
      } else {
        b.innerHTML = `🔒 Soal ${idx + 1}`;
      }
    });
  }

  // Update Penonton Kru
  updateTrialSpectatorProgress(accusedName, correctCount, totalNeeded) {
    const msg = document.getElementById('spectator-status-msg');
    if (msg) {
      msg.innerHTML = `⚡ <strong>${accusedName}</strong> berhasil menyelesaikan <strong>${correctCount}/${totalNeeded}</strong> pembuktian aljabar!`;
    }
    this.updateTrialStepBadges(correctCount, totalNeeded);
  }

  // Tampilkan Hasil Akhir Sidang Alibi
  showTrialVerdict(success, message) {
    if (this.trialTimerInterval) clearInterval(this.trialTimerInterval);

    const verdictBox = document.getElementById('trial-verdict-box');
    if (!verdictBox) return;

    verdictBox.style.display = 'block';
    if (success) {
      window.soundEngine.playVictory();
      verdictBox.className = 'trial-verdict success';
      verdictBox.innerHTML = `
        <h2>🎉 ALIBI TERBUKTI SAH (100% AKURAT)!</h2>
        <p>${message}</p>
        <div class="verdict-anim">🛡️ EKSEKUSI DIBATALKAN 🛡️</div>
      `;
    } else {
      window.soundEngine.playDefeat();
      verdictBox.className = 'trial-verdict failed';
      verdictBox.innerHTML = `
        <h2>💀 ALIBI GAGAL TERBUKTI!</h2>
        <p>${message}</p>
        <div class="verdict-anim">🌌 DIKELUARKAN KE LUAR ANGKASA 🌌</div>
      `;
    }

    setTimeout(() => {
      const modal = document.getElementById('impostor-trial-modal');
      if (modal) modal.style.display = 'none';
    }, 5500);
  }

  // Game Over Modal
  showGameOverModal(winner, reason, players) {
    this.hideMeetingModal();
    this.hideTaskModal();

    if (winner === 'crewmates') {
      window.soundEngine.playVictory();
    } else {
      window.soundEngine.playDefeat();
    }

    const modal = document.getElementById('game-over-modal');
    if (!modal) return;

    document.getElementById('game-over-title').innerText = winner === 'crewmates' ? '🏆 KEMENANGAN KRU!' : '🩸 KEMENANGAN IMPOSTOR!';
    document.getElementById('game-over-title').className = winner === 'crewmates' ? 'victory-title' : 'defeat-title';
    document.getElementById('game-over-reason').innerText = reason;

    // Tampilkan seluruh identitas role pemain
    const list = document.getElementById('game-over-players-list');
    list.innerHTML = '';
    players.forEach(p => {
      const row = document.createElement('div');
      row.className = `game-over-player-row ${p.role}`;
      row.innerHTML = `
        <span class="dot" style="background-color: ${p.colorHex};"></span>
        <span class="name">${p.name}</span>
        <span class="role-tag ${p.role}">${p.role === 'impostor' ? 'IMPOSTOR' : 'CREWMATE'}</span>
      `;
      list.appendChild(row);
    });

    modal.style.display = 'flex';
  }

  // Tambah Pesan Chat
  addChatMessage(senderName, senderColorHex, text, isGhost) {
    const box = document.getElementById('chat-messages-container');
    if (!box) return;

    const msg = document.createElement('div');
    msg.className = `chat-bubble ${isGhost ? 'ghost-chat' : ''}`;
    msg.innerHTML = `
      <strong style="color: ${senderColorHex}">${senderName} ${isGhost ? '👻 (Hantu)' : ''}:</strong> 
      <span>${text}</span>
    `;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
  }
}

window.uiManager = new UIManager();
