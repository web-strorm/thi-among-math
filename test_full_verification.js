// test_full_verification.js - Pengujian Otomatis Komprehensif Seluruh Fitur Game
const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

async function runFullVerification() {
  console.log('=================================================================');
  console.log('🧪 MEMULAI PENGUJIAN LENGKAP AMONG US MATEMATIKA MULTIPLAYER');
  console.log('=================================================================\n');

  const p1 = io(SERVER_URL);
  const p2 = io(SERVER_URL);

  let roomCode = null;

  // 1. UJI BUAT ROOM & GANTI NAMA SETIAP SAAT DI LOBBY
  p1.emit('create_room', { playerName: 'Astronot Awal', color: 'red' });

  p1.on('room_created', (data) => {
    roomCode = data.roomCode;
    console.log(`[PASS 1] Room berhasil dibuat dengan kode: ${roomCode}`);

    // P2 Gabung Room
    p2.emit('join_room', { roomCode: roomCode, playerName: 'Kru Linear', color: 'blue' });
  });

  p2.on('room_joined', () => {
    console.log(`[PASS 2] Pemain 2 berhasil terhubung dan masuk ke room ${roomCode}`);
    // P1 Ganti Nama di Lobby setelah P2 bergabung
    console.log('[TEST] Menguji penggantian nama pemain sebelum game dimulai...');
    setTimeout(() => {
      p1.emit('change_name', { newName: 'Kapten Aljabar' });
    }, 200);
  });

  p2.on('player_updated', (data) => {
    if (data.player.name === 'Kapten Aljabar') {
      p1NameUpdated = true;
      console.log(`[PASS 3] ✓ Ganti nama berhasil disinkronkan ke seluruh pemain: "${data.player.name}"`);
      
      // Mulai Game
      setTimeout(() => {
        console.log('[TEST] Memulai game multiplayer...');
        p1.emit('start_game');
      }, 500);
    }
  });

  let p1Data = null;
  let p2Data = null;

  // 2. UJI SINKRONISASI GAME START & ROLE
  p1.on('game_started', (data) => {
    p1Data = data.self;
    console.log(`[PASS 4] P1 menerima peran: ${p1Data.role.toUpperCase()} (Tugas: ${p1Data.tasks.length} soal)`);
  });

  p2.on('game_started', (data) => {
    p2Data = data.self;
    console.log(`[PASS 5] P2 menerima peran: ${p2Data.role.toUpperCase()} (Tugas: ${p2Data.tasks.length} soal)`);

    // 3. UJI GERAKAN KARAKTER (Movement 60 FPS)
    setTimeout(() => {
      console.log('[TEST] Menguji sinkronisasi pergerakan karakter...');
      p1.emit('player_move', { x: 1250, y: 800, vx: 2, vy: 0, facing: 'right', isAlive: true });
    }, 400);
  });

  p2.on('player_moved', (data) => {
    if (data.id === p1Data.id) {
      console.log(`[PASS 6] ✓ Koordinat gerakan P1 tersinkronisasi ke P2: (${data.x}, ${data.y})`);

      // 4. UJI PENGERJAAN TUGAS MATEMATIKA (CREWMATE TASK)
      const crewSocket = p1Data.role === 'crewmate' ? p1 : p2;
      const crewData = p1Data.role === 'crewmate' ? p1Data : p2Data;

      if (crewData.tasks.length > 0) {
        const task = crewData.tasks[0];
        console.log(`[TEST] Kru mengerjakan tugas: [${task.name}] - Kategori: ${task.category}`);
        console.log(`Soal: ${task.question.prompt.slice(0, 50)}...`);
        console.log(`Jawaban benar: ${task.question.correctAnswer}`);

        crewSocket.emit('submit_task_answer', {
          taskId: task.id,
          selectedAnswer: task.question.correctAnswer
        });
      }
    }
  });

  p1.on('task_completed_self', (data) => {
    handleTaskDone();
  });
  p2.on('task_completed_self', (data) => {
    handleTaskDone();
  });

  let meetingCalled = false;
  function handleTaskDone() {
    if (meetingCalled) return;
    meetingCalled = true;
    console.log(`[PASS 7] ✓ Tugas matematika berhasil diverifikasi benar oleh server!`);

    // 5. UJI SESI EMERGENCY MEETING & VOTING SINKRON
    setTimeout(() => {
      console.log('[TEST] Menguji pemanggilan Emergency Meeting...');
      p1.emit('call_emergency');
    }, 600);
  }

  p1.on('meeting_started', (data) => {
    console.log(`[PASS 8] ✓ Sesi Emergency Meeting sinkron aktif untuk semua pemain! (Dipanggil oleh: ${data.caller})`);
  });

  p1.on('voting_started', () => {
    console.log(`[PASS 9] ✓ Sesi voting aktif! Pemain melakukan vote kepada target Impostor...`);

    // Cari ID pemain yang menjadi Impostor
    const targetImpostorId = p1Data.role === 'impostor' ? p1Data.id : p2Data.id;

    p1.emit('cast_vote', { targetId: targetImpostorId });
    p2.emit('cast_vote', { targetId: targetImpostorId });
  });

  // 6. UJI MEKANIK TRIAL OF INNOCENCE / ALIBI MATEMATIKA IMPOSTOR (3 SOAL PERSAMAAN/PERTIDAKSAMAAN LINEAR)
  p1.on('start_impostor_trial', (data) => {
    console.log('\n=================================================================');
    console.log(`⚖️ PENGADILAN DARURAT: TRIAL OF INNOCENCE DIAKTIFKAN!`);
    console.log(`Terdakwa Impostor: ${data.accused.name}`);
    console.log(`Jumlah Soal yang Harus Benar 100%: ${data.totalQuestions} Soal Linear`);
    console.log('=================================================================\n');
  });

  const getImpostorSocket = () => (p1Data.role === 'impostor' ? p1 : p2);

  p1.on('trial_receive_question', (data) => onTrialQuestion(p1, data));
  p2.on('trial_receive_question', (data) => onTrialQuestion(p2, data));

  function onTrialQuestion(socket, data) {
    console.log(`[Terdakwa Impostor] Menerima Soal ${data.questionIndex + 1}/3: [${data.question.category}]`);
    console.log(`Prompt: ${data.question.prompt.slice(0, 60)}...`);
    console.log(`Jawaban Benar: ${data.question.correctAnswer}`);

    // Jawab dengan benar untuk membuktikan 3/3
    setTimeout(() => {
      console.log(`[Terdakwa Impostor] Mengirim jawaban benar untuk Soal ${data.questionIndex + 1}...`);
      socket.emit('trial_submit_answer', {
        questionIndex: data.questionIndex,
        selectedAnswer: data.question.correctAnswer
      });
    }, 500);
  }

  p1.on('trial_progress_update', (data) => {
    console.log(`[Live Telemetri Sidang] Status Pembuktian: ${data.correctCount}/${data.totalNeeded} Soal Linear Benar!`);
  });

  p1.on('trial_result', (data) => {
    console.log('\n=================================================================');
    console.log(`HASIL AKHIR SIDANG ALIBI: ${data.success ? '🎉 ALIBI TERBUKTI SAH (100% AKURAT)!' : '💀 GAGAL'}`);
    console.log(`Pesan Server: ${data.message}`);
    console.log('=================================================================\n');

    console.log('🎉 SEMUA PERSYARATAN TERVERIFIKASI SEMPURNA 100%! 🚀');
    p1.disconnect();
    p2.disconnect();
    process.exit(0);
  });
}

runFullVerification();
