// player.js - Entitas Player Crewmate & Impostor (Render Canvas 2D)
class Player {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.color = data.color || 'red';
    this.colorHex = data.colorHex || '#c51111';
    this.role = data.role || 'unknown'; // 'crewmate', 'impostor', 'unknown'
    this.isAlive = data.isAlive !== undefined ? data.isAlive : true;
    this.isHost = data.isHost || false;
    this.x = data.x || 1200;
    this.y = data.y || 750;
    this.targetX = this.x;
    this.targetY = this.y;
    this.vx = data.vx || 0;
    this.vy = data.vy || 0;
    this.facing = data.facing || 'right';
    this.inVent = data.inVent || false;
    this.walkCycle = 0;
    this.isMoving = false;
    this.radius = 24;
    this.tasks = data.tasks || [];
    this.completedTasksCount = data.completedTasksCount || 0;
    this.killCooldown = data.killCooldown || 0;
  }

  update(dt) {
    // Interpolasi posisi untuk pemain lain
    this.x += (this.targetX - this.x) * 0.35;
    this.y += (this.targetY - this.y) * 0.35;

    const speed = Math.hypot(this.vx, this.vy);
    this.isMoving = speed > 0.1 || Math.hypot(this.targetX - this.x, this.targetY - this.y) > 2;

    if (this.isMoving) {
      this.walkCycle += dt * 12;
      if (this.vx > 0.1) this.facing = 'right';
      else if (this.vx < -0.1) this.facing = 'left';
    } else {
      this.walkCycle = 0;
    }
  }

  // Menggambar Karakter Crewmate / Ghost
  draw(ctx, isLocal = false, localRole = 'crewmate', localIsAlive = true) {
    if (this.inVent) return; // Sembunyi jika di dalam ventilasi

    // Jika mati dan pemain lokal masih hidup, hantu tidak terlihat (kecuali pemain lokal juga hantu)
    if (!this.isAlive && localIsAlive && !isLocal) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Efek Transparan untuk Hantu (Ghost)
    if (!this.isAlive) {
      ctx.globalAlpha = 0.55;
    }

    const scale = this.facing === 'left' ? -1 : 1;
    ctx.scale(scale, 1);

    // Animasi Langkah Kaki
    const legOffset = this.isMoving ? Math.sin(this.walkCycle) * 7 : 0;

    // Warna Bayangan Dasar (Darker shade untuk shading)
    const baseColor = this.colorHex;
    const shadowColor = this.getDarkerShade(baseColor);

    // 1. Backpack / Tabung Oksigen Belakang
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.roundRect(-22, -16, 12, 32, 5);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0a0d14';
    ctx.stroke();

    // 2. Kaki Kiri & Kanan (Jika masih hidup)
    if (this.isAlive) {
      // Kaki Belakang
      ctx.fillStyle = shadowColor;
      ctx.beginPath();
      ctx.roundRect(-10, 16 - legOffset, 10, 16, 4);
      ctx.fill();
      ctx.strokeStyle = '#0a0d14';
      ctx.stroke();

      // Kaki Depan
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.roundRect(4, 16 + legOffset, 10, 16, 4);
      ctx.fill();
      ctx.strokeStyle = '#0a0d14';
      ctx.stroke();
    } else {
      // Ekor Hantu Berombak
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.moveTo(-16, 16);
      const wave = Math.sin(Date.now() / 150) * 5;
      ctx.quadraticCurveTo(-5, 30 + wave, 0, 20);
      ctx.quadraticCurveTo(5, 35 - wave, 16, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0a0d14';
      ctx.stroke();
    }

    // 3. Badan Utama (Body)
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.roundRect(-16, -26, 32, 44, [16, 16, 8, 8]);
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#0a0d14';
    ctx.stroke();

    // Shading Bawah Badan
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.roundRect(-16, 6, 32, 12, [0, 0, 8, 8]);
    ctx.fill();

    // 4. Kaca Helm / Visor (Kaca Biru Khas)
    ctx.fillStyle = '#98d1ed';
    ctx.beginPath();
    ctx.roundRect(0, -18, 20, 16, 8);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0a0d14';
    ctx.stroke();

    // Kilau Cahaya Kaca Visor
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.ellipse(8, -14, 5, 2.5, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 5. Nama Pemain & Role Tag di Atas Kepala
    ctx.save();
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';

    let nameColor = '#ffffff';
    if (this.role === 'impostor' && (localRole === 'impostor' || !this.isAlive)) {
      nameColor = '#ff3333'; // Merah untuk Impostor
    }

    // Background teks nama
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    const textWidth = ctx.measureText(this.name).width;
    ctx.fillRect(this.x - textWidth / 2 - 6, this.y - 48, textWidth + 12, 18);

    ctx.fillStyle = nameColor;
    ctx.fillText(this.name, this.x, this.y - 34);

    // Ikon Mahkota jika Host
    if (this.isHost) {
      ctx.fillStyle = '#ffcc00';
      ctx.font = '12px sans-serif';
      ctx.fillText('👑', this.x, this.y - 52);
    }

    ctx.restore();
  }

  // Menggambar Mayat Pemain Terbunuh (Dead Body)
  static drawDeadBody(ctx, body) {
    ctx.save();
    ctx.translate(body.x, body.y);

    const baseColor = body.victimColorHex || '#c51111';

    // Setengah Badan Bawah Terlentang
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.roundRect(-20, -5, 40, 22, [0, 0, 10, 10]);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0a0d14';
    ctx.stroke();

    // Tulang Putih Menonjol di Atas (Bone)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-4, -20, 8, 16, 2);
    ctx.fill();
    ctx.strokeStyle = '#0a0d14';
    ctx.stroke();

    // Kepala Tulang (Bone Joint)
    ctx.beginPath();
    ctx.arc(-3, -20, 4.5, 0, Math.PI * 2);
    ctx.arc(3, -20, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Genangan Darah Tipis
    ctx.fillStyle = 'rgba(180, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Helper untuk warna bayangan lebih gelap
  getDarkerShade(hex) {
    // Parse hex
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    let num = parseInt(c, 16);
    let r = Math.max(0, (num >> 16) - 45);
    let g = Math.max(0, ((num >> 8) & 0x00FF) - 45);
    let b = Math.max(0, (num & 0x0000FF) - 45);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

window.Player = Player;
