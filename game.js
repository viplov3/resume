/* =============================================
   SPACE DODGE — Endless Runner Game
   ============================================= */

(() => {
    'use strict';

    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // --- Game State ---
    let gameState = 'idle'; // idle | playing | gameover
    let score = 0;
    let highScore = parseInt(localStorage.getItem('spacedodge-highscore') || '0', 10);
    let frameCount = 0;
    let speedMultiplier = 1;
    let lastMilestone = 0;
    let shakeAmount = 0;
    let flashAlpha = 0;
    let flashColor = '245, 186, 19';
    let animFrameId = null;
    let speedLines = [];
    let milestoneText = '';
    let milestoneTimer = 0;
    let comboGlow = 0;

    // Canvas sizing
    let W, H;
    function resize() {
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const maxW = Math.min(rect.width - 4, 700);
        const maxH = Math.min(window.innerHeight * 0.55, 500);
        W = canvas.width = Math.floor(maxW);
        H = canvas.height = Math.floor(maxH);
    }

    // --- Speed Milestone System ---
    function checkSpeedMilestone() {
        const milestone = Math.floor(score / 25);
        if (milestone > lastMilestone && score > 0) {
            lastMilestone = milestone;
            // 50% increase each milestone, but ship also gets faster
            // Cap speed at 5x to keep game playable
            speedMultiplier = Math.min(5, Math.pow(1.5, milestone));

            // Trigger visual effects
            triggerSpeedUp();
        }
    }

    function triggerSpeedUp() {
        // Screen flash
        flashAlpha = 0.6;
        flashColor = '245, 186, 19';

        // Screen shake
        shakeAmount = 8;

        // Spawn speed lines burst
        for (let i = 0; i < 20; i++) {
            speedLines.push({
                x: Math.random() * W,
                y: -Math.random() * H * 0.3,
                length: 40 + Math.random() * 80,
                speed: 15 + Math.random() * 20,
                alpha: 0.6 + Math.random() * 0.4,
                width: 1 + Math.random() * 2
            });
        }

        // Milestone banner
        milestoneText = `⚡ SPEED ${Math.round(speedMultiplier * 100)}%`;
        milestoneTimer = 120; // 2 seconds

        // Combo glow
        comboGlow = 1;

        // Make ship leave a stronger trail temporarily
        ship.boostTimer = 60;
    }

    // --- Ship ---
    const ship = {
        x: 0, y: 0, w: 32, h: 40,
        targetX: 0, targetY: 0,
        trail: [],
        shield: false, shieldTimer: 0,
        boostTimer: 0,
        tilt: 0,
        reset() {
            this.x = W / 2;
            this.y = H - 80;
            this.targetX = this.x;
            this.targetY = this.y;
            this.trail = [];
            this.shield = false;
            this.shieldTimer = 0;
            this.boostTimer = 0;
            this.tilt = 0;
        },
        update() {
            // Smooth follow — ship gets slightly faster with speed multiplier
            const followSpeed = 0.12 + Math.min(speedMultiplier * 0.02, 0.1);
            const prevX = this.x;
            this.x += (this.targetX - this.x) * followSpeed;
            this.y += (this.targetY - this.y) * followSpeed;

            // Tilt based on horizontal movement
            const dx = this.x - prevX;
            this.tilt += (dx * 2 - this.tilt) * 0.1;
            this.tilt = Math.max(-0.4, Math.min(0.4, this.tilt));

            // Clamp
            this.x = Math.max(this.w / 2, Math.min(W - this.w / 2, this.x));
            this.y = Math.max(this.h / 2, Math.min(H - this.h / 2, this.y));

            // Trail particles
            const isBoosted = this.boostTimer > 0;
            const trailCount = isBoosted ? 3 : 1;
            for (let i = 0; i < trailCount; i++) {
                this.trail.push({
                    x: this.x + (Math.random() - 0.5) * (isBoosted ? 16 : 6),
                    y: this.y + this.h / 2,
                    alpha: 1,
                    size: isBoosted ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
                    hue: isBoosted ? 30 + Math.random() * 20 : 35
                });
            }
            if (this.trail.length > 30) this.trail.splice(0, this.trail.length - 30);
            this.trail.forEach(t => { t.alpha *= 0.88; t.y += 1.5; t.size *= 0.96; });

            // Shield countdown
            if (this.shield) {
                this.shieldTimer--;
                if (this.shieldTimer <= 0) this.shield = false;
            }

            // Boost countdown
            if (this.boostTimer > 0) this.boostTimer--;
        },
        draw() {
            // Engine trail particles
            this.trail.forEach(t => {
                ctx.beginPath();
                ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${t.hue}, 100%, 60%, ${t.alpha * 0.6})`;
                ctx.fill();
                // Glow
                ctx.beginPath();
                ctx.arc(t.x, t.y, t.size * 2, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${t.hue}, 100%, 60%, ${t.alpha * 0.1})`;
                ctx.fill();
            });

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.tilt);

            // Ship body (sleek triangle)
            ctx.beginPath();
            ctx.moveTo(0, -this.h / 2);
            ctx.lineTo(-this.w / 2, this.h / 2);
            ctx.quadraticCurveTo(0, this.h / 2 - 8, this.w / 2, this.h / 2);
            ctx.closePath();

            const grad = ctx.createLinearGradient(0, -this.h / 2, 0, this.h / 2);
            grad.addColorStop(0, '#ffd54f');
            grad.addColorStop(0.5, '#f5ba13');
            grad.addColorStop(1, '#e09800');
            ctx.fillStyle = grad;
            ctx.fill();

            // Wing accents
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-4, 0);
            ctx.lineTo(-this.w / 2 + 4, this.h / 2 - 4);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(4, 0);
            ctx.lineTo(this.w / 2 - 4, this.h / 2 - 4);
            ctx.stroke();

            // Cockpit
            ctx.beginPath();
            ctx.ellipse(0, -2, 4, 6, 0, 0, Math.PI * 2);
            const cockpitGrad = ctx.createRadialGradient(0, -2, 0, 0, -2, 6);
            cockpitGrad.addColorStop(0, '#4488ff');
            cockpitGrad.addColorStop(1, '#0a0a3a');
            ctx.fillStyle = cockpitGrad;
            ctx.fill();

            // Engine flames (animated)
            const flameH = 14 + Math.sin(frameCount * 0.5) * 4 + (this.boostTimer > 0 ? 8 : 0);
            const flameW = this.boostTimer > 0 ? 12 : 8;
            // Outer flame
            ctx.beginPath();
            ctx.moveTo(-flameW, this.h / 2);
            ctx.quadraticCurveTo(0, this.h / 2 + flameH + Math.random() * 6, flameW, this.h / 2);
            ctx.fillStyle = `rgba(255, 100, 0, ${0.5 + Math.random() * 0.3})`;
            ctx.fill();
            // Inner flame
            ctx.beginPath();
            ctx.moveTo(-flameW * 0.5, this.h / 2);
            ctx.quadraticCurveTo(0, this.h / 2 + flameH * 0.7 + Math.random() * 4, flameW * 0.5, this.h / 2);
            ctx.fillStyle = `rgba(255, 220, 100, ${0.6 + Math.random() * 0.4})`;
            ctx.fill();

            ctx.restore();

            // Shield bubble
            if (this.shield) {
                const shieldPulse = 0.4 + Math.sin(frameCount * 0.12) * 0.15;
                // Outer ring
                ctx.beginPath();
                ctx.arc(this.x, this.y, 30, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(100, 200, 255, ${shieldPulse})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                // Inner glow
                ctx.beginPath();
                ctx.arc(this.x, this.y, 28, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(100, 200, 255, 0.05)`;
                ctx.fill();
                // Rotating arcs
                const arcAngle = (frameCount * 0.03) % (Math.PI * 2);
                ctx.beginPath();
                ctx.arc(this.x, this.y, 30, arcAngle, arcAngle + 1);
                ctx.strokeStyle = `rgba(100, 200, 255, ${shieldPulse + 0.2})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }
    };

    // --- Asteroids ---
    let asteroids = [];
    class Asteroid {
        constructor() {
            this.radius = 12 + Math.random() * 22;
            this.x = Math.random() * (W - this.radius * 2) + this.radius;
            this.y = -this.radius - Math.random() * 100;
            this.baseSpeed = 1.5 + Math.random() * 2;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = (Math.random() - 0.5) * 0.05;
            this.vertices = this.generateVertices();
            this.wobble = Math.random() * Math.PI * 2;
            this.wobbleSpeed = 0.02 + Math.random() * 0.02;
            this.wobbleAmount = 0.3 + Math.random() * 0.5;
        }
        get speed() {
            return this.baseSpeed * speedMultiplier;
        }
        generateVertices() {
            const count = 7 + Math.floor(Math.random() * 5);
            const verts = [];
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const r = this.radius * (0.65 + Math.random() * 0.35);
                verts.push({ angle, r });
            }
            return verts;
        }
        update() {
            this.y += this.speed;
            this.wobble += this.wobbleSpeed;
            this.x += Math.sin(this.wobble) * this.wobbleAmount;
            this.rotation += this.rotSpeed * speedMultiplier;
        }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);

            ctx.beginPath();
            this.vertices.forEach((v, i) => {
                const px = Math.cos(v.angle) * v.r;
                const py = Math.sin(v.angle) * v.r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.closePath();

            const grad = ctx.createRadialGradient(-3, -3, 0, 0, 0, this.radius);
            grad.addColorStop(0, '#6a6a8a');
            grad.addColorStop(0.6, '#3a3a5a');
            grad.addColorStop(1, '#1a1a3a');
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Crater details
            ctx.beginPath();
            ctx.arc(this.radius * 0.2, -this.radius * 0.1, this.radius * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-this.radius * 0.3, this.radius * 0.2, this.radius * 0.1, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fill();

            ctx.restore();
        }
        isOffScreen() { return this.y > H + this.radius + 10; }
        collidesWith(sx, sy, sw, sh) {
            const dx = this.x - sx;
            const dy = this.y - sy;
            return Math.sqrt(dx * dx + dy * dy) < this.radius + Math.min(sw, sh) / 2.5;
        }
    }

    // --- Power-ups ---
    let powerups = [];
    class Powerup {
        constructor() {
            this.type = Math.random() < 0.5 ? 'shield' : 'star';
            this.x = Math.random() * (W - 40) + 20;
            this.y = -20;
            this.radius = 11;
            this.baseSpeed = 2 + Math.random();
            this.pulse = Math.random() * Math.PI * 2;
            this.angle = 0;
        }
        get speed() {
            return this.baseSpeed * Math.min(speedMultiplier, 2.5); // power-ups don't go as fast
        }
        update() {
            this.y += this.speed;
            this.pulse += 0.08;
            this.angle += 0.03;
        }
        draw() {
            const glow = 0.6 + Math.sin(this.pulse) * 0.3;
            const color = this.type === 'shield' ? [100, 200, 255] : [255, 215, 0];

            // Outer glow ring
            ctx.beginPath();
            ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color.join(',')}, ${glow * 0.1})`;
            ctx.fill();

            // Rotating ring
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 0.8);
            ctx.strokeStyle = `rgba(${color.join(',')}, ${glow * 0.5})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 16, Math.PI, Math.PI * 1.8);
            ctx.stroke();
            ctx.restore();

            // Core
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            const pGrad = ctx.createRadialGradient(this.x - 2, this.y - 2, 0, this.x, this.y, this.radius);
            pGrad.addColorStop(0, `rgba(${color.map(c => Math.min(255, c + 60)).join(',')}, ${glow})`);
            pGrad.addColorStop(1, `rgba(${color.join(',')}, ${glow * 0.8})`);
            ctx.fillStyle = pGrad;
            ctx.fill();

            // Icon
            ctx.fillStyle = '#0a0a2a';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.type === 'shield' ? '🛡' : '★', this.x, this.y);
        }
        isOffScreen() { return this.y > H + 20; }
        collidesWith(sx, sy) {
            return Math.sqrt((this.x - sx) ** 2 + (this.y - sy) ** 2) < 30;
        }
    }

    // --- Stars (background) ---
    let stars = [];
    function initStars() {
        stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: Math.random() * 2 + 0.3,
                speed: 0.2 + Math.random() * 1.2,
                alpha: 0.2 + Math.random() * 0.6,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.02 + Math.random() * 0.04
            });
        }
    }
    function updateStars() {
        stars.forEach(s => {
            s.y += s.speed * speedMultiplier * 0.6;
            s.twinkle += s.twinkleSpeed;
            if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
        });
    }
    function drawStars() {
        stars.forEach(s => {
            const twinkleAlpha = s.alpha * (0.6 + Math.sin(s.twinkle) * 0.4);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 210, 255, ${twinkleAlpha})`;
            ctx.fill();
        });
    }

    // --- Speed Lines ---
    function updateSpeedLines() {
        speedLines.forEach(l => {
            l.y += l.speed;
            l.alpha *= 0.97;
        });
        speedLines = speedLines.filter(l => l.alpha > 0.02 && l.y < H + l.length);
    }
    function drawSpeedLines() {
        speedLines.forEach(l => {
            ctx.beginPath();
            ctx.moveTo(l.x, l.y);
            ctx.lineTo(l.x, l.y - l.length);
            ctx.strokeStyle = `rgba(245, 186, 19, ${l.alpha})`;
            ctx.lineWidth = l.width;
            ctx.stroke();
        });
    }

    // --- Ambient speed lines (continuous at high speed) ---
    function spawnAmbientSpeedLines() {
        if (speedMultiplier >= 1.5 && frameCount % Math.max(1, Math.floor(4 / speedMultiplier)) === 0) {
            speedLines.push({
                x: Math.random() * W,
                y: -20,
                length: 20 + Math.random() * 40 * speedMultiplier,
                speed: 8 + Math.random() * 10 * speedMultiplier,
                alpha: 0.15 + Math.random() * 0.15,
                width: 0.5 + Math.random()
            });
        }
    }

    // --- Score Popups ---
    let scorePopups = [];
    class ScorePopup {
        constructor(x, y, text, color) {
            this.x = x;
            this.y = y;
            this.text = text;
            this.color = color || '#f5ba13';
            this.alpha = 1;
            this.vy = -2;
            this.scale = 1.5;
        }
        update() {
            this.y += this.vy;
            this.vy *= 0.96;
            this.alpha *= 0.96;
            this.scale += (1 - this.scale) * 0.1;
        }
        draw() {
            if (this.alpha < 0.05) return;
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.font = `bold ${14 * this.scale}px Outfit, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = this.color;
            ctx.fillText(this.text, this.x, this.y);
            ctx.restore();
        }
        isDone() { return this.alpha < 0.05; }
    }

    // --- Explosions ---
    let explosions = [];
    class Explosion {
        constructor(x, y, color, count) {
            this.particles = [];
            const n = count || 24;
            for (let i = 0; i < n; i++) {
                const angle = (i / n) * Math.PI * 2 + Math.random() * 0.3;
                const speed = 1.5 + Math.random() * 4.5;
                this.particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: 1.5 + Math.random() * 3.5,
                    alpha: 1,
                    hue: color || (25 + Math.random() * 35),
                    saturation: 90 + Math.random() * 10,
                    lightness: 50 + Math.random() * 30
                });
            }
        }
        update() {
            this.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.03; // slight gravity
                p.alpha *= 0.94;
                p.radius *= 0.97;
            });
            this.particles = this.particles.filter(p => p.alpha > 0.03);
        }
        draw() {
            this.particles.forEach(p => {
                // Glow
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha * 0.15})`;
                ctx.fill();
                // Core
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha})`;
                ctx.fill();
            });
        }
        isDone() { return this.particles.length === 0; }
    }

    // --- Input ---
    let inputX = 0, inputY = 0;
    let usingTouch = false;

    function onPointerMove(e) {
        const rect = canvas.getBoundingClientRect();
        if (e.touches) {
            usingTouch = true;
            inputX = e.touches[0].clientX - rect.left;
            inputY = e.touches[0].clientY - rect.top;
            e.preventDefault();
        } else {
            inputX = e.clientX - rect.left;
            inputY = e.clientY - rect.top;
        }
        if (gameState === 'playing') {
            ship.targetX = inputX;
            ship.targetY = inputY;
        }
    }

    function onTap(e) {
        if (gameState === 'idle' || gameState === 'gameover') {
            startGame();
        }
    }

    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('click', onTap);
    canvas.addEventListener('touchstart', (e) => {
        onPointerMove(e);
        onTap(e);
    }, { passive: false });

    let keysDown = {};
    window.addEventListener('keydown', (e) => {
        keysDown[e.key] = true;
        if ((e.key === ' ' || e.key === 'Enter') && (gameState === 'idle' || gameState === 'gameover')) {
            e.preventDefault();
            startGame();
        }
    });
    window.addEventListener('keyup', (e) => { keysDown[e.key] = false; });

    function handleKeys() {
        const speed = 6 + Math.min(speedMultiplier, 3); // Ship keyboard speed scales slightly
        if (keysDown['ArrowLeft'] || keysDown['a']) ship.targetX -= speed;
        if (keysDown['ArrowRight'] || keysDown['d']) ship.targetX += speed;
        if (keysDown['ArrowUp'] || keysDown['w']) ship.targetY -= speed;
        if (keysDown['ArrowDown'] || keysDown['s']) ship.targetY += speed;
    }

    // --- Game Logic ---
    function startGame() {
        score = 0;
        frameCount = 0;
        speedMultiplier = 1;
        lastMilestone = 0;
        shakeAmount = 0;
        flashAlpha = 0;
        milestoneText = '';
        milestoneTimer = 0;
        comboGlow = 0;
        asteroids = [];
        powerups = [];
        explosions = [];
        scorePopups = [];
        speedLines = [];
        ship.reset();
        gameState = 'playing';
        updateScoreDisplay();
    }

    function gameOver() {
        gameState = 'gameover';
        shakeAmount = 15;
        flashAlpha = 0.8;
        flashColor = '255, 60, 60';

        // Big explosion
        explosions.push(new Explosion(ship.x, ship.y, 0, 40));
        explosions.push(new Explosion(ship.x, ship.y, 35, 20));

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('spacedodge-highscore', String(highScore));
        }
        updateScoreDisplay();
    }

    function updateScoreDisplay() {
        const scoreEl = document.getElementById('game-score');
        const highEl = document.getElementById('game-high-score');
        if (scoreEl) scoreEl.textContent = score;
        if (highEl) highEl.textContent = highScore;
    }

    // --- Main Loop ---
    function update() {
        if (gameState !== 'playing') return;

        frameCount++;

        handleKeys();
        ship.update();
        updateStars();
        updateSpeedLines();
        spawnAmbientSpeedLines();

        // Spawn asteroids — rate increases with speed
        const baseRate = 40;
        const spawnRate = Math.max(10, baseRate / speedMultiplier);
        if (frameCount % Math.floor(spawnRate) === 0) {
            asteroids.push(new Asteroid());
        }

        // Spawn powerups (more frequent at higher speeds to help player)
        const pupRate = speedMultiplier >= 2 ? 200 : 300;
        if (frameCount % pupRate === 0 && Math.random() < 0.7) {
            powerups.push(new Powerup());
        }

        // Update asteroids
        asteroids.forEach(a => a.update());
        asteroids = asteroids.filter(a => {
            if (a.isOffScreen()) {
                score++;
                checkSpeedMilestone();
                return false;
            }
            return true;
        });

        // Update powerups
        powerups.forEach(p => p.update());
        powerups = powerups.filter(p => {
            if (p.collidesWith(ship.x, ship.y)) {
                if (p.type === 'shield') {
                    ship.shield = true;
                    ship.shieldTimer = 180;
                    scorePopups.push(new ScorePopup(p.x, p.y, '🛡 SHIELD', '#64c8ff'));
                } else {
                    score += 10;
                    checkSpeedMilestone();
                    scorePopups.push(new ScorePopup(p.x, p.y, '+10', '#ffd54f'));
                }
                explosions.push(new Explosion(p.x, p.y, p.type === 'shield' ? 200 : 45, 14));
                return false;
            }
            return !p.isOffScreen();
        });

        // Collision detection
        for (const a of asteroids) {
            if (a.collidesWith(ship.x, ship.y, ship.w, ship.h)) {
                if (ship.shield) {
                    ship.shield = false;
                    ship.shieldTimer = 0;
                    explosions.push(new Explosion(a.x, a.y, 200, 18));
                    scorePopups.push(new ScorePopup(a.x, a.y, '+5', '#64c8ff'));
                    asteroids = asteroids.filter(ast => ast !== a);
                    score += 5;
                    shakeAmount = 5;
                    flashAlpha = 0.2;
                    flashColor = '100, 200, 255';
                    checkSpeedMilestone();
                    break;
                } else {
                    gameOver();
                    return;
                }
            }
        }

        // Update explosions & popups
        explosions.forEach(e => e.update());
        explosions = explosions.filter(e => !e.isDone());
        scorePopups.forEach(p => p.update());
        scorePopups = scorePopups.filter(p => !p.isDone());

        // Decay effects
        if (shakeAmount > 0) shakeAmount *= 0.9;
        if (flashAlpha > 0) flashAlpha *= 0.92;
        if (comboGlow > 0) comboGlow *= 0.95;
        if (milestoneTimer > 0) milestoneTimer--;

        updateScoreDisplay();
    }

    function draw() {
        ctx.save();

        // Screen shake
        if (shakeAmount > 0.5) {
            ctx.translate(
                (Math.random() - 0.5) * shakeAmount,
                (Math.random() - 0.5) * shakeAmount
            );
        }

        // Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#030310');
        bgGrad.addColorStop(0.4, '#080822');
        bgGrad.addColorStop(1, '#0a0520');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Speed vignette (edges darken at high speed)
        if (speedMultiplier > 1) {
            const vignetteAlpha = Math.min((speedMultiplier - 1) * 0.15, 0.4);
            const vGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
            vGrad.addColorStop(0, 'transparent');
            vGrad.addColorStop(1, `rgba(100, 30, 0, ${vignetteAlpha})`);
            ctx.fillStyle = vGrad;
            ctx.fillRect(0, 0, W, H);
        }

        drawStars();
        drawSpeedLines();

        if (gameState === 'playing') {
            asteroids.forEach(a => a.draw());
            powerups.forEach(p => p.draw());
            ship.draw();
            explosions.forEach(e => e.draw());
            scorePopups.forEach(p => p.draw());

            // Speed indicator
            if (speedMultiplier > 1) {
                drawSpeedIndicator();
            }

            // Milestone banner
            if (milestoneTimer > 0) {
                drawMilestoneBanner();
            }
        } else if (gameState === 'idle') {
            drawIdleScreen();
        } else if (gameState === 'gameover') {
            asteroids.forEach(a => a.draw());
            explosions.forEach(e => e.draw());
            drawGameOverScreen();
        }

        // Full-screen flash overlay
        if (flashAlpha > 0.01) {
            ctx.fillStyle = `rgba(${flashColor}, ${flashAlpha})`;
            ctx.fillRect(0, 0, W, H);
        }

        // Edge glow at high speed
        if (comboGlow > 0.01) {
            const edgeGrad = ctx.createLinearGradient(0, 0, 0, 6);
            edgeGrad.addColorStop(0, `rgba(245, 186, 19, ${comboGlow * 0.8})`);
            edgeGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = edgeGrad;
            ctx.fillRect(0, 0, W, 6);
        }

        ctx.restore();
    }

    function drawSpeedIndicator() {
        const text = `${Math.round(speedMultiplier * 100)}%`;
        const x = W - 16;
        const y = 26;
        ctx.save();
        ctx.textAlign = 'right';
        ctx.font = `bold 11px Outfit, sans-serif`;
        ctx.fillStyle = `rgba(245, 186, 19, ${0.4 + Math.sin(frameCount * 0.05) * 0.15})`;
        ctx.fillText(`⚡ ${text}`, x, y);
        ctx.restore();
    }

    function drawMilestoneBanner() {
        const progress = milestoneTimer / 120;
        let alpha;
        if (progress > 0.8) {
            alpha = (1 - progress) / 0.2; // fade in
        } else if (progress < 0.2) {
            alpha = progress / 0.2; // fade out
        } else {
            alpha = 1;
        }

        const scale = 0.8 + alpha * 0.2;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';

        // Background pill
        const textW = ctx.measureText(milestoneText).width;
        ctx.font = `bold ${20 * scale}px Outfit, sans-serif`;
        const pillW = textW + 80;
        const pillH = 40;
        const pillX = W / 2 - pillW / 2;
        const pillY = H * 0.2;

        ctx.fillStyle = 'rgba(245, 186, 19, 0.15)';
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 20);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 186, 19, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffd54f';
        ctx.fillText(milestoneText, W / 2, pillY + pillH / 2 + 7);

        ctx.restore();
    }

    function drawIdleScreen() {
        // Floating ship animation
        const bobY = Math.sin(Date.now() * 0.002) * 10;
        const bobR = Math.sin(Date.now() * 0.001) * 0.05;
        ctx.save();
        ctx.translate(W / 2, H / 2 - 30 + bobY);
        ctx.rotate(bobR);

        // Ship
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(-22, 28);
        ctx.quadraticCurveTo(0, 20, 22, 28);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, -28, 0, 28);
        g.addColorStop(0, '#ffd54f');
        g.addColorStop(1, '#e09800');
        ctx.fillStyle = g;
        ctx.fill();

        // Cockpit
        ctx.beginPath();
        ctx.ellipse(0, -2, 4, 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#4488ff';
        ctx.fill();

        // Engine
        const fh = 12 + Math.sin(Date.now() * 0.01) * 4;
        ctx.beginPath();
        ctx.moveTo(-6, 28);
        ctx.quadraticCurveTo(0, 28 + fh, 6, 28);
        ctx.fillStyle = `rgba(255, 120, 0, ${0.6 + Math.random() * 0.3})`;
        ctx.fill();

        ctx.restore();

        // Title with glow
        ctx.save();
        ctx.shadowColor = 'rgba(245, 186, 19, 0.5)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#f5ba13';
        ctx.font = `bold ${Math.min(W * 0.08, 40)}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('SPACE DODGE', W / 2, H / 2 - 100);
        ctx.restore();

        // Subtitle
        ctx.fillStyle = 'rgba(200, 200, 230, 0.6)';
        ctx.font = `${Math.min(W * 0.033, 15)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Dodge asteroids  •  Collect power-ups  •  Beat your score', W / 2, H / 2 + 30);

        // Start prompt (pulsing)
        const pulse = 0.4 + Math.sin(Date.now() * 0.005) * 0.5;
        ctx.fillStyle = `rgba(245, 186, 19, ${pulse})`;
        ctx.font = `600 ${Math.min(W * 0.04, 18)}px Inter, sans-serif`;
        ctx.fillText(usingTouch ? 'TAP TO START' : 'CLICK or PRESS SPACE', W / 2, H / 2 + 70);

        // Controls
        ctx.fillStyle = 'rgba(150, 150, 180, 0.4)';
        ctx.font = `${Math.min(W * 0.026, 11)}px Inter, sans-serif`;
        ctx.fillText(usingTouch ? 'Drag to steer your ship' : 'Mouse or WASD / Arrow Keys to steer', W / 2, H / 2 + 98);

        // High score
        if (highScore > 0) {
            ctx.fillStyle = 'rgba(200, 200, 230, 0.4)';
            ctx.font = `${Math.min(W * 0.03, 13)}px Inter, sans-serif`;
            ctx.fillText(`Best: ${highScore}`, W / 2, H / 2 + 125);
        }
    }

    function drawGameOverScreen() {
        // Dark overlay
        ctx.fillStyle = 'rgba(3, 3, 16, 0.75)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center';

        // Game over with glow
        ctx.save();
        ctx.shadowColor = 'rgba(255, 50, 50, 0.5)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff4444';
        ctx.font = `bold ${Math.min(W * 0.09, 46)}px Outfit, sans-serif`;
        ctx.fillText('GAME OVER', W / 2, H / 2 - 55);
        ctx.restore();

        // Score
        ctx.fillStyle = '#f5ba13';
        ctx.font = `bold ${Math.min(W * 0.065, 34)}px Outfit, sans-serif`;
        ctx.fillText(`Score: ${score}`, W / 2, H / 2);

        // Speed reached
        if (speedMultiplier > 1) {
            ctx.fillStyle = 'rgba(245, 186, 19, 0.5)';
            ctx.font = `${Math.min(W * 0.03, 13)}px Inter, sans-serif`;
            ctx.fillText(`Max Speed: ${Math.round(speedMultiplier * 100)}%`, W / 2, H / 2 + 28);
        }

        // High score
        const isNew = score >= highScore && score > 0;
        ctx.fillStyle = isNew ? '#ffd54f' : 'rgba(200, 200, 230, 0.5)';
        ctx.font = `${isNew ? 'bold ' : ''}${Math.min(W * 0.04, 17)}px ${isNew ? 'Outfit' : 'Inter'}, sans-serif`;
        ctx.fillText(isNew ? '🏆 NEW HIGH SCORE!' : `Best: ${highScore}`, W / 2, H / 2 + 55);

        // Restart prompt
        const pulse = 0.4 + Math.sin(Date.now() * 0.005) * 0.5;
        ctx.fillStyle = `rgba(245, 186, 19, ${pulse})`;
        ctx.font = `600 ${Math.min(W * 0.038, 16)}px Inter, sans-serif`;
        ctx.fillText(usingTouch ? 'TAP TO RETRY' : 'CLICK or PRESS SPACE', W / 2, H / 2 + 95);
    }

    function loop() {
        update();
        draw();
        animFrameId = requestAnimationFrame(loop);
    }

    // --- Init ---
    function initGame() {
        resize();
        initStars();
        updateScoreDisplay();
        loop();
    }

    let gameResizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(gameResizeTimeout);
        gameResizeTimeout = setTimeout(() => {
            resize();
            initStars();
        }, 200);
    });

    // Lazy init when section scrolls into view
    const gameSection = document.getElementById('game');
    if (gameSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !animFrameId) {
                    initGame();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        observer.observe(gameSection);
    } else {
        initGame();
    }
})();
