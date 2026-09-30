// map.js - Peta Kapal Luar Angkasa (The Skeld Math Odyssey)
// Menyediakan geometri ruangan, collision box, ventilasi (vents), meja emergency, dan konsol task

class GameMap {
  constructor() {
    this.width = 2600;
    this.height = 1800;

    // Daftar Ruangan
    this.rooms = [
      { id: 'cafeteria', name: 'KAFETARIA', x: 950, y: 500, w: 500, h: 400, color: '#1a2233' },
      { id: 'weapons', name: 'SENJATA', x: 1750, y: 400, w: 350, h: 300, color: '#251c2d' },
      { id: 'o2', name: 'OKSIGEN (O2)', x: 1500, y: 800, w: 250, h: 250, color: '#162b2e' },
      { id: 'navigation', name: 'NAVIGASI', x: 2050, y: 850, w: 350, h: 350, color: '#192636' },
      { id: 'shields', name: 'PERISAI', x: 1750, y: 1250, w: 350, h: 300, color: '#2c1e28' },
      { id: 'admin', name: 'RUANG ADMIN', x: 1450, y: 1150, w: 300, h: 300, color: '#242a1b' },
      { id: 'storage', name: 'PENYIMPANAN', x: 950, y: 1350, w: 500, h: 400, color: '#26241b' },
      { id: 'electrical', name: 'LISTRIK', x: 650, y: 1100, w: 300, h: 300, color: '#2d2b15' },
      { id: 'lower_engine', name: 'MESIN BAWAH', x: 300, y: 1300, w: 300, h: 300, color: '#2e1c1c' },
      { id: 'upper_engine', name: 'MESIN ATAS', x: 300, y: 550, w: 300, h: 300, color: '#2e1c1c' },
      { id: 'reactor', name: 'REAKTOR UTAMA', x: 100, y: 850, w: 300, h: 400, color: '#182b26' },
      { id: 'medbay', name: 'MEDBAY (MEDIS)', x: 650, y: 650, w: 300, h: 300, color: '#162e2e' },
      { id: 'security', name: 'KEAMANAN / CCTV', x: 650, y: 950, w: 250, h: 150, color: '#201e2b' }
    ];

    // Lorong-lorong Kapal (Hallways)
    this.hallways = [
      // Cafeteria ke Weapons
      { x: 1450, y: 600, w: 300, h: 120 },
      // Weapons ke O2 & Navigation
      { x: 1850, y: 700, w: 120, h: 150 },
      { x: 1950, y: 950, w: 100, h: 120 },
      // Navigation ke Shields
      { x: 2150, y: 1200, w: 120, h: 150 },
      { x: 1950, y: 1350, w: 120, h: 100 },
      // Shields ke Admin & Storage
      { x: 1750, y: 1450, w: 100, h: 100 },
      { x: 1450, y: 1500, w: 100, h: 120 },
      // Cafeteria ke Admin
      { x: 1200, y: 900, w: 120, h: 250 },
      { x: 1200, y: 1150, w: 250, h: 120 },
      // Storage ke Electrical
      { x: 950, y: 1250, w: 100, h: 100 },
      // Storage ke Lower Engine
      { x: 600, y: 1500, w: 350, h: 120 },
      // Lower Engine ke Reactor
      { x: 250, y: 1250, w: 150, h: 100 },
      // Upper Engine ke Reactor
      { x: 250, y: 750, w: 150, h: 100 },
      // Reactor Corridor
      { x: 200, y: 800, w: 120, h: 500 },
      // Upper Engine ke Cafeteria & MedBay
      { x: 600, y: 650, w: 350, h: 120 },
      // Medbay ke Cafeteria
      { x: 900, y: 700, w: 100, h: 120 },
      // Security Corridor
      { x: 550, y: 950, w: 100, h: 120 }
    ];

    // Dinding & Kolisi (Bounding Boxes yang tidak bisa ditembus pemain)
    this.walls = this.generateWallColliders();

    // Meja Emergency di Kafetaria
    this.emergencyTable = {
      x: 1200,
      y: 700,
      radius: 70
    };

    // Jaringan Ventilasi (Vents) Khusus Impostor
    this.vents = [
      { id: 'vent_cafeteria', x: 1350, y: 550, room: 'Cafeteria', connectedTo: ['vent_admin', 'vent_hallway'] },
      { id: 'vent_admin', x: 1650, y: 1200, room: 'Admin', connectedTo: ['vent_cafeteria', 'vent_hallway'] },
      { id: 'vent_hallway', x: 1800, y: 600, room: 'Koridor Weapons', connectedTo: ['vent_cafeteria', 'vent_admin'] },

      { id: 'vent_reactor_top', x: 200, y: 900, room: 'Reactor Atas', connectedTo: ['vent_upper_engine'] },
      { id: 'vent_upper_engine', x: 350, y: 600, room: 'Upper Engine', connectedTo: ['vent_reactor_top'] },

      { id: 'vent_reactor_bot', x: 200, y: 1200, room: 'Reactor Bawah', connectedTo: ['vent_lower_engine'] },
      { id: 'vent_lower_engine', x: 350, y: 1500, room: 'Lower Engine', connectedTo: ['vent_reactor_bot'] },

      { id: 'vent_medbay', x: 700, y: 700, room: 'MedBay', connectedTo: ['vent_electrical', 'vent_security'] },
      { id: 'vent_electrical', x: 700, y: 1150, room: 'Electrical', connectedTo: ['vent_medbay', 'vent_security'] },
      { id: 'vent_security', x: 700, y: 1000, room: 'Security', connectedTo: ['vent_medbay', 'vent_electrical'] },

      { id: 'vent_nav_top', x: 2250, y: 900, room: 'Navigation Atas', connectedTo: ['vent_weapons', 'vent_shields'] },
      { id: 'vent_shields', x: 1950, y: 1450, room: 'Shields', connectedTo: ['vent_nav_top', 'vent_weapons'] },
      { id: 'vent_weapons', x: 1950, y: 450, room: 'Weapons', connectedTo: ['vent_nav_top', 'vent_shields'] }
    ];

    // Lokasi Konsol Task Matematika
    this.taskStations = [
      { id: 'task_cafeteria', room: 'Cafeteria', name: 'Sambung Kabel Linear (PLSV)', category: 'PLSV', x: 1050, y: 550, icon: '⚡' },
      { id: 'task_weapons', room: 'Weapons', name: 'Tembak Asteroid Aljabar (PtLSV)', category: 'PtLSV', x: 2000, y: 450, icon: '🎯' },
      { id: 'task_o2', room: 'O2', name: 'Kalibrasi Tangki O2 (Soal Cerita)', category: 'Cerita', x: 1650, y: 880, icon: '💨' },
      { id: 'task_navigation', room: 'Navigation', name: 'Plot Koordinat Vektor (SPLDV)', category: 'SPLDV', x: 2300, y: 1000, icon: '🚀' },
      { id: 'task_shields', room: 'Shields', name: 'Daya Perisai Nilai Mutlak', category: 'NilaiMutlak', x: 1850, y: 1480, icon: '🛡️' },
      { id: 'task_admin', room: 'Admin', name: 'Swipe Kartu Akses SPLDV', category: 'SPLDV', x: 1550, y: 1220, icon: '💳' },
      { id: 'task_storage', room: 'Storage', name: 'Isi Bahan Bakar Tangki (Cerita)', category: 'Cerita', x: 1200, y: 1650, icon: '⛽' },
      { id: 'task_electrical', room: 'Electrical', name: 'Saklar Daya Arus (PLSV)', category: 'PLSV', x: 750, y: 1300, icon: '🔌' },
      { id: 'task_medbay', room: 'MedBay', name: 'Scan Biometrik Garis (PtLSV)', category: 'PtLSV', x: 750, y: 720, icon: '🔬' },
      { id: 'task_reactor', room: 'Reactor', name: 'Stabilisasi Inti Reaktor (Mutlak)', category: 'NilaiMutlak', x: 200, y: 1050, icon: '⚛️' }
    ];
  }

  // Menghitung bounding boxes untuk dinding
  generateWallColliders() {
    const list = [];
    const margin = 20;

    // Batas Luar Peta
    list.push({ x: 0, y: 0, w: this.width, h: 80 }); // Atas
    list.push({ x: 0, y: this.height - 80, w: this.width, h: 80 }); // Bawah
    list.push({ x: 0, y: 0, w: 80, h: this.height }); // Kiri
    list.push({ x: this.width - 80, y: 0, w: 80, h: this.height }); // Kanan

    // Rintangan internal / Dinding antar ruangan
    list.push({ x: 550, y: 300, w: 80, h: 350 });
    list.push({ x: 1450, y: 300, w: 80, h: 300 });
    list.push({ x: 900, y: 900, w: 80, h: 200 });
    list.push({ x: 1450, y: 900, w: 80, h: 250 });
    list.push({ x: 600, y: 1350, w: 80, h: 150 });
    list.push({ x: 1450, y: 1250, w: 80, h: 250 });
    list.push({ x: 1750, y: 700, w: 80, h: 150 });
    list.push({ x: 1750, y: 1050, w: 80, h: 200 });

    return list;
  }

  // Cek collision pemain dengan semua dinding dan meja emergency
  checkCollision(newX, newY, radius = 22) {
    // Cek batas map
    if (newX - radius < 90 || newX + radius > this.width - 90) return true;
    if (newY - radius < 90 || newY + radius > this.height - 90) return true;

    // Cek Meja Emergency Cafeteria
    const distToTable = Math.hypot(newX - this.emergencyTable.x, newY - this.emergencyTable.y);
    if (distToTable < this.emergencyTable.radius + radius - 5) {
      return true;
    }

    // Cek Dinding
    for (const wall of this.walls) {
      // Find closest point on rectangle
      const closestX = Math.max(wall.x, Math.min(newX, wall.x + wall.w));
      const closestY = Math.max(wall.y, Math.min(newY, wall.y + wall.h));
      const distX = newX - closestX;
      const distY = newY - closestY;
      const distSquared = distX * distX + distY * distY;

      if (distSquared < radius * radius) {
        return true;
      }
    }

    return false;
  }

  // Menggambar seluruh peta kapal ke Canvas
  draw(ctx, camera) {
    // 1. Background Luar Angkasa Gelap & Bintang
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid Lantai Sci-Fi
    ctx.strokeStyle = '#141c2b';
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = 0; x < this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // 2. Gambar Lorong (Hallways)
    ctx.fillStyle = '#182030';
    this.hallways.forEach(hall => {
      ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
      ctx.strokeStyle = '#2b3a55';
      ctx.lineWidth = 4;
      ctx.strokeRect(hall.x, hall.y, hall.w, hall.h);
    });

    // 3. Gambar Ruangan (Rooms)
    this.rooms.forEach(room => {
      // Lantai Ruangan
      ctx.fillStyle = room.color;
      ctx.fillRect(room.x, room.y, room.w, room.h);

      // Border Dinding Ruangan
      ctx.strokeStyle = '#3a4e72';
      ctx.lineWidth = 6;
      ctx.strokeRect(room.x, room.y, room.w, room.h);

      // Label Nama Ruangan
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.font = 'bold 24px "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.name, room.x + room.w / 2, room.y + room.h / 2);
    });

    // 4. Gambar Meja Emergency Cafeteria
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.emergencyTable.x, this.emergencyTable.y, this.emergencyTable.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#223049';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#435e8d';
    ctx.stroke();

    // Tombol Merah Emergency di Tengah Meja
    ctx.beginPath();
    ctx.arc(this.emergencyTable.x, this.emergencyTable.y, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#e61919';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff6b6b';
    ctx.stroke();

    // Label Emergency
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('EMERGENCY', this.emergencyTable.x, this.emergencyTable.y + 35);
    ctx.restore();

    // 5. Gambar Ventilasi (Vents)
    this.vents.forEach(vent => {
      ctx.save();
      // Kisi ventilasi logam
      ctx.fillStyle = '#444';
      ctx.fillRect(vent.x - 25, vent.y - 18, 50, 36);

      ctx.strokeStyle = '#777';
      ctx.lineWidth = 3;
      ctx.strokeRect(vent.x - 25, vent.y - 18, 50, 36);

      // Garis jeruji
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      for (let i = -16; i <= 16; i += 8) {
        ctx.beginPath();
        ctx.moveTo(vent.x + i, vent.y - 14);
        ctx.lineTo(vent.x + i, vent.y + 14);
        ctx.stroke();
      }

      ctx.restore();
    });

    // 6. Gambar Konsol Task Matematika
    this.taskStations.forEach(station => {
      ctx.save();
      // Kotak Konsol
      ctx.fillStyle = '#1c2d42';
      ctx.fillRect(station.x - 20, station.y - 20, 40, 40);
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2;
      ctx.strokeRect(station.x - 20, station.y - 20, 40, 40);

      // Ikon Task
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(station.icon, station.x, station.y);

      // Indikator Kuning Berkedip
      const pulse = (Math.sin(Date.now() / 250) + 1) / 2;
      ctx.strokeStyle = `rgba(255, 204, 0, ${0.4 + pulse * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(station.x, station.y, 28, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });

    // 7. Gambar Dinding Tambahan & Obstacles
    ctx.fillStyle = '#2d3b50';
    ctx.strokeStyle = '#435875';
    ctx.lineWidth = 3;
    this.walls.forEach(w => {
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    });
  }
}

window.GameMap = GameMap;
