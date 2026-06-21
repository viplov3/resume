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
    let difficulty = 1;
    let shakeAmount = 0;
    let animFrameId = null;

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

    // --- Ship ---
    const ship = {
        x: 0, y: 0, w: 32, h: 40,
        targetX: 0, targetY: 0,
        trail: [],
        shield: false, shieldTimer: 0,
        reset() {
            this.x = W / 2;
            this.y = H - 80;
            this.targetX = this.x;
            this.targetY = this.y;
            this.trail = [];
            this.shield = false;
            this.shieldTimer = 0;
        },
        update() {
            // Smooth follow
            this.x += (this.targetX - this.x) * 0.12;
            this.y += (this.targetY - this.y) * 0.12;

            // Clamp
            this.x = Math.max(this.w / 2, Math.min(W - this.w / 2, this.x));
            this.y = Math.max(this.h / 2, Math.min(H - this.h / 2, this.y));

            // Trail
            this.trail.push({ x: this.x, y: this.y + this.h / 2, alpha: 1 });
            if (this.trail.length > 18) this.trail.shift();
            this.trail.forEach(t => t.alpha *= 0.88);

            // Shield countdown
            if (this.shield) {
                this.shieldTimer--;
                if (this.shieldTimer <= 0) this.shield = false;
            }
        },
        draw() {
            // Engine trail
            this.trail.forEach((t, i) => {
                const size = (i / this.trail.length) * 6 + 2;
                ctx.beginPath();
                ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(245, 186, 19, ${t.alpha * 0.5})`;
                ctx.fill();
            });

            ctx.save();
            ctx.translate(this.x, this.y);

            // Ship body (triangle)
            ctx.beginPath();
            ctx.moveTo(0, -this.h / 2);
            ctx.lineTo(-this.w / 2, this.h / 2);
            ctx.lineTo(this.w / 2, this.h / 2);
            ctx.closePath();

            const grad = ctx.createLinearGradient(0, -this.h / 2, 0, this.h / 2);
            grad.addColorStop(0, '#ffd54f');
            grad.addColorStop(1, '#f5ba13');
            ctx.fillStyle = grad;
            ctx.fill();

            // Cockpit
            ctx.beginPath();
            ctx.arc(0, 2, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#0a0a2a';
            ctx.fill();

            // Engine glow
            ctx.beginPath();
            ctx.moveTo(-8, this.h / 2);
            ctx.lineTo(0, this.h / 2 + 12 + Math.random() * 6);
            ctx.lineTo(8, this.h / 2);
            ctx.fillStyle = `rgba(255, 138, 0, ${0.6 + Math.random() * 0.4})`;
            ctx.fill();

            ctx.restore();

            // Shield bubble
            if (this.shield) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, 28, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(100, 200, 255, ${0.4 + Math.sin(frameCount * 0.15) * 0.2})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = `rgba(100, 200, 255, 0.06)`;
                ctx.fill();
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
            this.speed = 1.5 + Math.random() * 2 + difficulty * 0.3;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = (Math.random() - 0.5) * 0.04;
            this.vertices = this.generateVertices();
        }
        generateVertices() {
            const count = 7 + Math.floor(Math.random() * 4);
            const verts = [];
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const r = this.radius * (0.7 + Math.random() * 0.3);
                verts.push({ angle, r });
            }
            return verts;
        }
        update() {
            this.y += this.speed;
            this.rotation += this.rotSpeed;
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

            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
            grad.addColorStop(0, '#5a5a7a');
            grad.addColorStop(1, '#2a2a4a');
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.restore();
        }
        isOffScreen() { return this.y > H + this.radius + 10; }
        collidesWith(sx, sy, sw, sh) {
            const cx = sx, cy = sy;
            const dx = this.x - cx;
            const dy = this.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < this.radius + Math.min(sw, sh) / 2.5;
        }
    }

    // --- Power-ups ---
    let powerups = [];
    class Powerup {
        constructor() {
            this.type = Math.random() < 0.5 ? 'shield' : 'star';
            this.x = Math.random() * (W - 40) + 20;
            this.y = -20;
            this.radius = 10;
            this.speed = 2 + Math.random();
            this.pulse = Math.random() * Math.PI * 2;
        }
        update() {
            this.y += this.speed;
            this.pulse += 0.08;
        }
        draw() {
            const glow = 0.5 + Math.sin(this.pulse) * 0.3;
            const color = this.type === 'shield' ? [100, 200, 255] : [255, 215, 0];

            // Glow
            ctx.beginPath();
            ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color.join(',')}, ${glow * 0.15})`;
            ctx.fill();

            // Icon
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color.join(',')}, ${glow})`;
            ctx.fill();

            // Symbol
            ctx.fillStyle = '#0a0a2a';
            ctx.font = 'bold 12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.type === 'shield' ? '🛡' : '★', this.x, this.y);
        }
        isOffScreen() { return this.y > H + 20; }
        collidesWith(sx, sy) {
            const dx = this.x - sx;
            const dy = this.y - sy;
            return Math.sqrt(dx * dx + dy * dy) < 30;
        }
    }

    // --- Stars (background) ---
    let stars = [];
    function initStars() {
        stars = [];
        for (let i = 0; i < 80; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: Math.random() * 1.8 + 0.3,
                speed: 0.3 + Math.random() * 1.2,
                alpha: 0.3 + Math.random() * 0.5
            });
        }
    }
    function updateStars() {
        stars.forEach(s => {
            s.y += s.speed * (0.5 + difficulty * 0.15);
            if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
        });
    }
    function drawStars() {
        stars.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 200, 255, ${s.alpha})`;
            ctx.fill();
        });
    }

    // --- Explosions ---
    let explosions = [];
    class Explosion {
        constructor(x, y, color) {
            this.particles = [];
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 4;
                this.particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: 1.5 + Math.random() * 3,
                    alpha: 1,
                    color: color || `hsl(${30 + Math.random() * 30}, 100%, ${50 + Math.random() * 30}%)`
                });
            }
        }
        update() {
            this.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha *= 0.93;
                p.radius *= 0.97;
            });
            this.particles = this.particles.filter(p => p.alpha > 0.05);
        }
        draw() {
            this.particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = typeof p.color === 'string' ? p.color.replace(')', `, ${p.alpha})`.replace('hsl', 'hsla')) : `rgba(245,186,19,${p.alpha})`;
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

    // Keyboard support
    let keysDown = {};
    window.addEventListener('keydown', (e) => {
        keysDown[e.key] = true;
        if ((e.key === ' ' || e.key === 'Enter') && (gameState === 'idle' || gameState === 'gameover')) {
            startGame();
        }
    });
    window.addEventListener('keyup', (e) => { keysDown[e.key] = false; });

    function handleKeys() {
        const speed = 6;
        if (keysDown['ArrowLeft'] || keysDown['a']) ship.targetX -= speed;
        if (keysDown['ArrowRight'] || keysDown['d']) ship.targetX += speed;
        if (keysDown['ArrowUp'] || keysDown['w']) ship.targetY -= speed;
        if (keysDown['ArrowDown'] || keysDown['s']) ship.targetY += speed;
    }

    // --- Game Logic ---
    function startGame() {
        score = 0;
        frameCount = 0;
        difficulty = 1;
        shakeAmount = 0;
        asteroids = [];
        powerups = [];
        explosions = [];
        ship.reset();
        gameState = 'playing';
        updateScoreDisplay();
    }

    function gameOver() {
        gameState = 'gameover';
        shakeAmount = 12;
        explosions.push(new Explosion(ship.x, ship.y));

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
        difficulty = 1 + Math.floor(frameCount / 500) * 0.4;

        handleKeys();
        ship.update();
        updateStars();

        // Spawn asteroids
        const spawnRate = Math.max(18, 45 - difficulty * 4);
        if (frameCount % Math.floor(spawnRate) === 0) {
            asteroids.push(new Asteroid());
        }

        // Spawn powerups
        if (frameCount % 300 === 0 && Math.random() < 0.6) {
            powerups.push(new Powerup());
        }

        // Update asteroids
        asteroids.forEach(a => a.update());
        asteroids = asteroids.filter(a => {
            if (a.isOffScreen()) {
                score++;
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
                    ship.shieldTimer = 180; // 3 seconds at 60fps
                } else {
                    score += 10;
                }
                explosions.push(new Explosion(p.x, p.y, 'hsla(200, 100%, 70%'));
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
                    explosions.push(new Explosion(a.x, a.y));
                    asteroids = asteroids.filter(ast => ast !== a);
                    score += 5;
                    break;
                } else {
                    gameOver();
                    return;
                }
            }
        }

        // Update explosions
        explosions.forEach(e => e.update());
        explosions = explosions.filter(e => !e.isDone());

        // Shake decay
        if (shakeAmount > 0) shakeAmount *= 0.9;

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
        bgGrad.addColorStop(0, '#050515');
        bgGrad.addColorStop(0.5, '#0a0a2a');
        bgGrad.addColorStop(1, '#0d0828');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        drawStars();

        if (gameState === 'playing') {
            asteroids.forEach(a => a.draw());
            powerups.forEach(p => p.draw());
            ship.draw();
            explosions.forEach(e => e.draw());
        } else if (gameState === 'idle') {
            drawIdleScreen();
        } else if (gameState === 'gameover') {
            asteroids.forEach(a => a.draw());
            explosions.forEach(e => e.draw());
            drawGameOverScreen();
        }

        ctx.restore();
    }

    function drawIdleScreen() {
        // Floating ship animation
        const bobY = Math.sin(Date.now() * 0.003) * 8;
        ctx.save();
        ctx.translate(W / 2, H / 2 - 30 + bobY);

        // Ship
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(-20, 25);
        ctx.lineTo(20, 25);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, -25, 0, 25);
        g.addColorStop(0, '#ffd54f');
        g.addColorStop(1, '#f5ba13');
        ctx.fillStyle = g;
        ctx.fill();

        // Engine
        ctx.beginPath();
        ctx.moveTo(-5, 25);
        ctx.lineTo(0, 35 + Math.random() * 5);
        ctx.lineTo(5, 25);
        ctx.fillStyle = `rgba(255, 138, 0, ${0.6 + Math.random() * 0.4})`;
        ctx.fill();

        ctx.restore();

        // Title
        ctx.fillStyle = '#f5ba13';
        ctx.font = `bold ${Math.min(W * 0.07, 36)}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SPACE DODGE', W / 2, H / 2 - 90);

        // Subtitle
        ctx.fillStyle = 'rgba(200, 200, 230, 0.7)';
        ctx.font = `${Math.min(W * 0.035, 16)}px Inter, sans-serif`;
        ctx.fillText('Dodge asteroids • Collect power-ups • Set high scores', W / 2, H / 2 + 30);

        // Start prompt
        const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.4;
        ctx.fillStyle = `rgba(245, 186, 19, ${pulse})`;
        ctx.font = `600 ${Math.min(W * 0.04, 18)}px Inter, sans-serif`;
        const promptText = usingTouch ? 'TAP TO START' : 'CLICK or PRESS SPACE';
        ctx.fillText(promptText, W / 2, H / 2 + 70);

        // Controls hint
        ctx.fillStyle = 'rgba(150, 150, 180, 0.5)';
        ctx.font = `${Math.min(W * 0.028, 12)}px Inter, sans-serif`;
        const controlText = usingTouch ? 'Move your finger to steer' : 'Mouse or WASD / Arrow keys to move';
        ctx.fillText(controlText, W / 2, H / 2 + 100);
    }

    function drawGameOverScreen() {
        // Dim overlay
        ctx.fillStyle = 'rgba(5, 5, 16, 0.7)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center';

        // Game over text
        ctx.fillStyle = '#ff4444';
        ctx.font = `bold ${Math.min(W * 0.08, 42)}px Outfit, sans-serif`;
        ctx.fillText('GAME OVER', W / 2, H / 2 - 50);

        // Score
        ctx.fillStyle = '#f5ba13';
        ctx.font = `bold ${Math.min(W * 0.06, 30)}px Outfit, sans-serif`;
        ctx.fillText(`Score: ${score}`, W / 2, H / 2);

        // High score
        const isNew = score >= highScore && score > 0;
        ctx.fillStyle = isNew ? '#ffd54f' : 'rgba(200, 200, 230, 0.6)';
        ctx.font = `${Math.min(W * 0.035, 16)}px Inter, sans-serif`;
        ctx.fillText(isNew ? `🏆 NEW HIGH SCORE!` : `Best: ${highScore}`, W / 2, H / 2 + 35);

        // Restart prompt
        const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.4;
        ctx.fillStyle = `rgba(245, 186, 19, ${pulse})`;
        ctx.font = `600 ${Math.min(W * 0.04, 16)}px Inter, sans-serif`;
        ctx.fillText(usingTouch ? 'TAP TO RETRY' : 'CLICK or PRESS SPACE', W / 2, H / 2 + 80);
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

    // Resize handler
    let gameResizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(gameResizeTimeout);
        gameResizeTimeout = setTimeout(() => {
            resize();
            initStars();
        }, 200);
    });

    // Start when visible (IntersectionObserver)
    const gameSection = document.getElementById('game');
    if (gameSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !animFrameId) {
                    initGame();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        observer.observe(gameSection);
    } else {
        // Fallback: init immediately
        initGame();
    }
})();
