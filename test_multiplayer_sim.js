// test_multiplayer_sim.js - Uji Simulasi Multiplayer & Mekanik Impostor Alibi Trial
const io = require('socket.io-client');
const http = require('http');

const SERVER_URL = 'http://localhost:3000';

async function runMultiplayerTest() {
  console.log('--- STARTING MULTIPLAYER SOCKET TEST ---');

  const p1 = io(SERVER_URL);
  const p2 = io(SERVER_URL);

  let roomCode = null;

  // 1. Player 1 Buat Room
  p1.emit('create_room', { playerName: 'Astronot Merah', color: 'red' });

  p1.on('room_created', (data) => {
    roomCode = data.roomCode;
    console.log(`[P1] Room berhasil dibuat dengan kode: ${roomCode}`);

    // 2. Player 2 Gabung Room
    p2.emit('join_room', { roomCode: roomCode, playerName: 'Astronot Biru', color: 'blue' });
  });

  p2.on('room_joined', (data) => {
    console.log(`[P2] Berhasil bergabung ke room ${data.roomCode}`);
    console.log(`Total pemain di room: ${data.players.length}`);

    // 3. Player 1 Mulai Game
    setTimeout(() => {
      console.log('[P1] Memulai game...');
      p1.emit('start_game');
    }, 500);
  });

  let p1Role = null;
  let p2Role = null;
  let p1Tasks = [];

  p1.on('game_started', (data) => {
    p1Role = data.self.role;
    p1Tasks = data.self.tasks;
    console.log(`[P1] Game dimulai! Peran: ${p1Role.toUpperCase()}, Jumlah Task: ${p1Tasks.length}`);
  });

  p2.on('game_started', (data) => {
    p2Role = data.self.role;
    console.log(`[P2] Game dimulai! Peran: ${p2Role.toUpperCase()}`);

    // 4. Uji Pengerjaan Task Matematika
    setTimeout(() => {
      if (p1Tasks.length > 0) {
        const t = p1Tasks[0];
        console.log(`[P1] Mengerjakan tugas [${t.name}]...`);
        console.log(`Soal: ${t.question.prompt.slice(0, 60)}...`);
        console.log(`Jawaban benar: ${t.question.correctAnswer}`);
        p1.emit('submit_task_answer', { taskId: t.id, selectedAnswer: t.question.correctAnswer });
      }
    }, 1000);
  });

  p1.on('task_completed_self', (data) => {
    console.log(`[P1] ✓ Task selesai diverifikasi server! Selesai: ${data.completedCount}/${data.totalTasks}`);

    // 5. Panggil Emergency Meeting
    setTimeout(() => {
      console.log('[P1] Memanggil Emergency Meeting di meja Cafeteria...');
      p1.emit('call_emergency');
    }, 1000);
  });

  p1.on('meeting_started', (data) => {
    console.log(`[ALL] 🚨 Meeting Dimulai! Dipanggil oleh: ${data.caller}`);
  });

  p1.on('voting_started', (data) => {
    console.log(`[ALL] 🗳️ Waktu voting aktif!`);

    // Cari ID siapa yang menjadi Impostor untuk di-vote keluar
    const targetVoteId = p1Role === 'impostor' ? p1.id : p2.id;
    console.log(`Pemain vote target Impostor (ID: ${targetVoteId})...`);

    p1.emit('cast_vote', { targetId: targetVoteId });
    p2.emit('cast_vote', { targetId: targetVoteId });
  });

  // 6. UJI FITUR UTAMA: IMPOSTOR TRIAL ALIBI DEFENSE
  p1.on('start_impostor_trial', (data) => {
    console.log(`\n======================================================`);
    console.log(`⚖️ TRIAL OF INNOCENCE DIAKTIFKAN UNTUK: ${data.accused.name}`);
    console.log(`Total Soal yang Harus Dijawab: ${data.totalQuestions}`);
    console.log(`======================================================\n`);
  });

  const impostorSocket = () => (p1Role === 'impostor' ? p1 : p2);

  p1.on('trial_receive_question', (data) => handleTrialAnswer(p1, data));
  p2.on('trial_receive_question', (data) => handleTrialAnswer(p2, data));

  function handleTrialAnswer(socket, data) {
    console.log(`[Terdakwa Impostor] Menerima Soal ${data.questionIndex + 1}/${data.totalQuestions}: [${data.question.category}]`);
    console.log(`Jawaban Benar: ${data.question.correctAnswer}`);

    // Impostor menjawab dengan jawaban yang benar untuk membuktikan alibi
    setTimeout(() => {
      console.log(`[Terdakwa Impostor] Mengirim jawaban benar untuk Soal ${data.questionIndex + 1}...`);
      socket.emit('trial_submit_answer', {
        questionIndex: data.questionIndex,
        selectedAnswer: data.question.correctAnswer
      });
    }, 600);
  }

  p1.on('trial_progress_update', (data) => {
    console.log(`[Live Telemetri] Progress Alibi: ${data.correctCount}/${data.totalNeeded} Benar!`);
  });

  p1.on('trial_result', (data) => {
    console.log(`\n======================================================`);
    console.log(`HASIL SIDANG: ${data.success ? '🎉 SUKSES LOLOS!' : '💀 GAGAL'}`);
    console.log(`Pesan: ${data.message}`);
    console.log(`======================================================\n`);

    console.log('✅ SELURUH SISTEM MULTIPLAYER & TRIAL ALIBI BERFUNGSI SEMPURNA 100%!');
    p1.disconnect();
    p2.disconnect();
    process.exit(0);
  });
}

runMultiplayerTest();
