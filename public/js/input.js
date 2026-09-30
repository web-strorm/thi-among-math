// input.js - Kontrol Input Multi-Perangkat (PC/Laptop: Keyboard & Mouse, HP/Mobile: Dynamic Touch Joystick & Tap)
class InputManager {
  constructor() {
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    // Touch Joystick Dinamis (Bisa disentuh di mana saja di area kiri layar)
    this.joystick = {
      active: false,
      touchId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      vx: 0,
      vy: 0,
      maxRadius: 45
    };

    // Kontrol Mouse untuk PC/Laptop (Klik & Tahan untuk berjalan menuju kursor)
    this.mouseControl = {
      active: false,
      targetWorldX: 0,
      targetWorldY: 0,
      vx: 0,
      vy: 0
    };

    this.isChatting = false;
    this.initKeyboard();
    this.initMouseNavigation();
    this.initDynamicTouchJoystick();
    this.initOrientationDetector();
  }

  // 1. KONTROL KEYBOARD (PC / Laptop)
  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Jika sedang mengetik di chat atau input, nonaktifkan hotkey gerakan
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        this.isChatting = true;
        return;
      }
      this.isChatting = false;

      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.keys.up = true;
      if (code === 'KeyS' || code === 'ArrowDown') this.keys.down = true;
      if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = true;

      if (code === 'KeyE' || code === 'Space') {
        e.preventDefault();
        this.triggerAction('use');
      }
      if (code === 'KeyQ') {
        this.triggerAction('kill');
      }
      if (code === 'KeyR') {
        this.triggerAction('report');
      }
      if (code === 'KeyV') {
        this.triggerAction('vent');
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.keys.up = false;
      if (code === 'KeyS' || code === 'ArrowDown') this.keys.down = false;
      if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = false;
    });
  }

  // 2. KONTROL MOUSE (PC / Laptop: Klik / Tahan untuk berjalan)
  initMouseNavigation() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Hanya klik kiri
      if (this.isChatting) return;
      this.mouseControl.active = true;
      this.updateMouseTarget(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.mouseControl.active) return;
      this.updateMouseTarget(e);
    });

    window.addEventListener('mouseup', () => {
      this.mouseControl.active = false;
      this.mouseControl.vx = 0;
      this.mouseControl.vy = 0;
    });
  }

  updateMouseTarget(e) {
    if (!window.game || !window.game.localPlayer) return;
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Hitung posisi kursor relatif terhadap tengah layar (karakter pemain)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const dx = screenX - centerX;
    const dy = screenY - centerY;
    const dist = Math.hypot(dx, dy);

    // Deadzone 25px di sekitar karakter agar tidak bergetar saat kursor di atas pemain
    if (dist > 25) {
      this.mouseControl.vx = dx / dist;
      this.mouseControl.vy = dy / dist;
    } else {
      this.mouseControl.vx = 0;
      this.mouseControl.vy = 0;
    }
  }

  // 3. KONTROL TOUCH JOYSTICK DINAMIS (HP / Mobile & Tablet)
  initDynamicTouchJoystick() {
    const joystickZone = document.getElementById('joystick-zone');
    const joystickKnob = document.getElementById('joystick-knob');
    const gameContainer = document.getElementById('game-container');

    if (!joystickZone || !joystickKnob || !gameContainer) return;

    // Sentuh di area kiri layar (50% lebar layar) untuk memunculkan joystick di bawah jempol
    const onTouchStart = (e) => {
      // Abaikan jika sedang membuka modal
      if (document.querySelector('.game-modal-overlay[style*="display: flex"]')) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        
        // Cek jika sentuhan berada di setengah bagian kiri layar
        if (touch.clientX < window.innerWidth * 0.55 && !this.joystick.active) {
          this.joystick.active = true;
          this.joystick.touchId = touch.identifier;
          this.joystick.startX = touch.clientX;
          this.joystick.startY = touch.clientY;

          // Pindahkan visual joystick tepat ke titik sentuh jempol
          joystickZone.style.display = 'flex';
          joystickZone.style.left = `${touch.clientX - 60}px`;
          joystickZone.style.top = `${touch.clientY - 60}px`;
          joystickZone.style.bottom = 'auto';

          this.updateJoystickMove(touch.clientX, touch.clientY, joystickKnob);
          break;
        }
      }
    };

    const onTouchMove = (e) => {
      if (!this.joystick.active) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystick.touchId) {
          e.preventDefault();
          this.updateJoystickMove(touch.clientX, touch.clientY, joystickKnob);
          break;
        }
      }
    };

    const onTouchEnd = (e) => {
      if (!this.joystick.active) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystick.touchId) {
          this.joystick.active = false;
          this.joystick.touchId = null;
          this.joystick.vx = 0;
          this.joystick.vy = 0;
          joystickKnob.style.transform = 'translate(0px, 0px)';
          
          // Reset posisi default joystick di pojok kiri bawah
          joystickZone.style.left = '25px';
          joystickZone.style.bottom = '25px';
          joystickZone.style.top = 'auto';
          break;
        }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
  }

  updateJoystickMove(clientX, clientY, knob) {
    const dx = clientX - this.joystick.startX;
    const dy = clientY - this.joystick.startY;
    const dist = Math.hypot(dx, dy);

    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, this.joystick.maxRadius);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    knob.style.transform = `translate(${knobX}px, ${knobY}px)`;

    // Normalisasi vektor kecepatan
    this.joystick.vx = knobX / this.joystick.maxRadius;
    this.joystick.vy = knobY / this.joystick.maxRadius;
  }

  // 4. DETEKTOR ORIENTASI LANDSCAPE (HP / Mobile)
  initOrientationDetector() {
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      const isMobile = window.innerWidth <= 960 || 'ontouchstart' in window;
      const enforcer = document.getElementById('landscape-enforcer-overlay');

      if (enforcer) {
        if (isPortrait && isMobile) {
          enforcer.style.display = 'flex';
        } else {
          enforcer.style.display = 'none';
        }
      }
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', () => {
      setTimeout(checkOrientation, 200);
    });
    checkOrientation();

    // Tombol Request Fullscreen & Landscape Lock
    const btnFullscreen = document.getElementById('btn-force-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
          if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
          }
        } catch (err) {
          console.log('Orientation lock / Fullscreen:', err);
        }
      });
    }
  }

  // 5. MENGHITUNG VEKTOR GERAKAN AKHIR (Prioritas: Joystick > Keyboard > Mouse)
  getMovementVector() {
    if (this.isChatting) return { vx: 0, vy: 0 };

    let vx = 0;
    let vy = 0;

    if (this.joystick.active) {
      vx = this.joystick.vx;
      vy = this.joystick.vy;
    } else if (this.keys.up || this.keys.down || this.keys.left || this.keys.right) {
      if (this.keys.up) vy -= 1;
      if (this.keys.down) vy += 1;
      if (this.keys.left) vx -= 1;
      if (this.keys.right) vx += 1;

      // Normalisasi diagonal keyboard
      if (vx !== 0 && vy !== 0) {
        const len = Math.hypot(vx, vy);
        vx /= len;
        vy /= len;
      }
    } else if (this.mouseControl.active) {
      vx = this.mouseControl.vx;
      vy = this.mouseControl.vy;
    }

    return { vx, vy };
  }

  triggerAction(type) {
    if (window.game) {
      window.game.handlePlayerAction(type);
    }
  }
}

window.InputManager = InputManager;
