/* =============================================
   PORTFOLIO — INTERACTIVE SCRIPT
   ============================================= */

(() => {
    'use strict';

    /* -----------------------------------------
       1. TYPEWRITER EFFECT (enhanced)
       ----------------------------------------- */
    const typewriterText =
        "Results-oriented Software Engineer with 5+ years of experience\n" +
        "building high-performance web applications and APIs.\n" +
        "Proven ability to collaborate effectively, troubleshoot\n" +
        "complex issues, and deliver successful projects.";

    const typewriterEl = document.getElementById('typewriter-text');
    const cursorEl = document.getElementById('typewriter-cursor');
    let twIndex = 0;
    let typewriterStarted = false;

    function typeWriter() {
        if (!typewriterEl) return;
        if (twIndex < typewriterText.length) {
            const char = typewriterText.charAt(twIndex);
            if (char === '\n') {
                typewriterEl.innerHTML += '<br>';
            } else {
                typewriterEl.innerHTML += char;
            }
            twIndex++;
            setTimeout(typeWriter, 35);
        } else {
            // Typing done — keep cursor blinking for a while then fade out
            setTimeout(() => {
                if (cursorEl) {
                    cursorEl.style.transition = 'opacity 0.5s';
                    cursorEl.style.opacity = '0';
                    setTimeout(() => { cursorEl.style.display = 'none'; }, 500);
                }
            }, 3000);
        }
    }

    /* -----------------------------------------
       2. SCROLL REVEAL (IntersectionObserver)
       ----------------------------------------- */
    function initScrollReveal() {
        const reveals = document.querySelectorAll('.reveal');
        if (!reveals.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');

                    // Start typewriter when About section enters view
                    if (entry.target.closest('#about') && !typewriterStarted) {
                        typewriterStarted = true;
                        typeWriter();
                    }

                    // Animate skill bars when Skills section enters view
                    if (entry.target.closest('#skills')) {
                        animateSkillBars(entry.target);
                    }

                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -30px 0px'
        });

        reveals.forEach((el) => observer.observe(el));
    }

    /* -----------------------------------------
       3. SKILL BARS ANIMATION
       ----------------------------------------- */
    function animateSkillBars(target) {
        const bars = target.querySelectorAll('.skill-bar-fill');
        bars.forEach((bar, i) => {
            const percent = bar.getAttribute('data-percent');
            if (percent) {
                setTimeout(() => {
                    bar.style.width = percent + '%';
                }, 150 + (i * 100));
            }
        });
    }

    /* -----------------------------------------
       4. SMOOTH SCROLL NAVIGATION + ACTIVE LINK
       ----------------------------------------- */
    function initSmoothScroll() {
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
        navLinks.forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                    closeMobileNav();
                }
            });
        });

        // Handle any other in-page links
        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            if (!link.classList.contains('nav-link') && !link.classList.contains('mobile-nav-link')) {
                link.addEventListener('click', (e) => {
                    const targetId = link.getAttribute('href');
                    if (targetId && targetId !== '#') {
                        e.preventDefault();
                        const targetEl = document.querySelector(targetId);
                        if (targetEl) {
                            targetEl.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                });
            }
        });
    }

    function updateActiveNav() {
        const sections = document.querySelectorAll('.section, .hero-section');
        const navLinks = document.querySelectorAll('.nav-link');
        const scrollY = window.scrollY + 150;

        let currentSection = '';
        sections.forEach((section) => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            if (scrollY >= top && scrollY < top + height) {
                currentSection = section.getAttribute('id');
            }
        });

        navLinks.forEach((link) => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === currentSection) {
                link.classList.add('active');
            }
        });
    }

    /* -----------------------------------------
       5. STICKY HEADER
       ----------------------------------------- */
    function initStickyHeader() {
        const header = document.getElementById('header');
        if (!header) return;

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    if (window.scrollY > 50) {
                        header.classList.add('scrolled');
                    } else {
                        header.classList.remove('scrolled');
                    }
                    updateActiveNav();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    /* -----------------------------------------
       6. THEME TOGGLE
       ----------------------------------------- */
    function initThemeToggle() {
        const toggle = document.getElementById('theme-toggle');
        const icon = document.getElementById('theme-icon');
        if (!toggle || !icon) return;

        // Restore saved theme
        const saved = localStorage.getItem('portfolio-theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
            updateThemeIcon(saved, icon);
        }

        toggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('portfolio-theme', next);
            updateThemeIcon(next, icon);
        });
    }

    function updateThemeIcon(theme, icon) {
        if (theme === 'light') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    /* -----------------------------------------
       7. HAMBURGER / MOBILE NAV
       ----------------------------------------- */
    function initHamburger() {
        const hamburger = document.getElementById('hamburger');
        const mobileNav = document.getElementById('mobile-nav');
        if (!hamburger || !mobileNav) return;

        hamburger.addEventListener('click', () => {
            const isOpen = hamburger.classList.toggle('open');
            mobileNav.classList.toggle('open');
            hamburger.setAttribute('aria-expanded', isOpen);
            mobileNav.setAttribute('aria-hidden', !isOpen);
        });
    }

    function closeMobileNav() {
        const hamburger = document.getElementById('hamburger');
        const mobileNav = document.getElementById('mobile-nav');
        if (hamburger && mobileNav) {
            hamburger.classList.remove('open');
            mobileNav.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
            mobileNav.setAttribute('aria-hidden', 'true');
        }
    }

    /* -----------------------------------------
       8. RESUME MODAL
       ----------------------------------------- */
    function initResumeModal() {
        const previewBtn = document.getElementById('btn-preview-resume');
        const modal = document.getElementById('resume-modal');
        const closeBtn = document.getElementById('modal-close');
        const overlay = document.getElementById('modal-overlay');

        if (!previewBtn || !modal) return;

        function openModal() {
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
        function closeModal() {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        previewBtn.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay) overlay.addEventListener('click', closeModal);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('open')) {
                closeModal();
            }
        });
    }

    /* -----------------------------------------
       9. BACK TO TOP BUTTON
       ----------------------------------------- */
    function initBackToTop() {
        const btn = document.getElementById('back-to-top');
        if (!btn) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        }, { passive: true });

        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* -----------------------------------------
       10. PARTICLE CANVAS — Enhanced
       ----------------------------------------- */
    function initParticles() {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let mouseX = -1000, mouseY = -1000;

        // Adaptive particle count based on screen width
        function getParticleCount() {
            if (width < 600) return 30;
            if (width < 1024) return 50;
            return 70;
        }

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            // Recreate particles on resize
            const count = getParticleCount();
            if (Math.abs(particles.length - count) > 10) {
                particles = [];
                for (let i = 0; i < count; i++) {
                    particles.push(new Particle());
                }
            }
        }
        resize();

        // Track mouse for interactivity
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }, { passive: true });
        window.addEventListener('mouseleave', () => {
            mouseX = -1000;
            mouseY = -1000;
        });

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resize, 150);
        });

        class Particle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.radius = Math.random() * 2.5 + 0.8;
                this.baseSpeedX = (Math.random() - 0.5) * 0.35;
                this.baseSpeedY = (Math.random() - 0.5) * 0.35;
                this.speedX = this.baseSpeedX;
                this.speedY = this.baseSpeedY;
                this.opacity = Math.random() * 0.5 + 0.15;
                this.pulsePhase = Math.random() * Math.PI * 2;
                this.pulseSpeed = 0.01 + Math.random() * 0.02;
            }
            update() {
                // Pulse opacity
                this.pulsePhase += this.pulseSpeed;
                const pulseOpacity = this.opacity + Math.sin(this.pulsePhase) * 0.12;

                // Mouse repulsion
                const dx = this.x - mouseX;
                const dy = this.y - mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    const force = (120 - dist) / 120;
                    this.speedX = this.baseSpeedX + (dx / dist) * force * 1.5;
                    this.speedY = this.baseSpeedY + (dy / dist) * force * 1.5;
                } else {
                    this.speedX += (this.baseSpeedX - this.speedX) * 0.05;
                    this.speedY += (this.baseSpeedY - this.speedY) * 0.05;
                }

                this.x += this.speedX;
                this.y += this.speedY;

                // Wrap around edges
                if (this.x < -10) this.x = width + 10;
                if (this.x > width + 10) this.x = -10;
                if (this.y < -10) this.y = height + 10;
                if (this.y > height + 10) this.y = -10;

                return pulseOpacity;
            }
            draw(opacity) {
                const theme = document.documentElement.getAttribute('data-theme');
                const r = theme === 'light' ? 120 : 245;
                const g = theme === 'light' ? 100 : 186;
                const b = theme === 'light' ? 20 : 19;

                // Glow effect
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.08})`;
                ctx.fill();

                // Core dot
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                ctx.fill();
            }
        }

        // Create initial particles
        const count = getParticleCount();
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }

        function drawConnections() {
            const theme = document.documentElement.getAttribute('data-theme');
            const r = theme === 'light' ? 120 : 245;
            const g = theme === 'light' ? 100 : 186;
            const b = theme === 'light' ? 20 : 19;
            const maxDist = 130;

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < maxDist) {
                        const opacity = (1 - dist / maxDist) * 0.18;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach((p) => {
                const opacity = p.update();
                p.draw(opacity);
            });
            drawConnections();
            requestAnimationFrame(animate);
        }

        animate();
    }

    /* -----------------------------------------
       INIT ALL
       ----------------------------------------- */
    function init() {
        initScrollReveal();
        initSmoothScroll();
        initStickyHeader();
        initThemeToggle();
        initHamburger();
        initResumeModal();
        initBackToTop();
        initParticles();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
