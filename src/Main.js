/**
 * Main.js - Core Game Loop & State Management
 * CRS Invaders Pro - Hemodynamic Defense Simulation
 */

import { ParticleSystem, CRSCalculator, circleCollision, isInStagnationZone, calculateWobble, lerp } from './Physics.js';
import { HUD, ScreenShake, LevelTransition, OverlayController } from './UI.js';

// ============================================
// GAME CONSTANTS
// ============================================
const COLORS = {
    primary: '#c94f52',
    primaryLight: '#f8c5be',
    primaryDark: '#a2272c',
    clotColors: ['#c94f52', '#a2272c', '#8b1e23', '#d4605f'],
    particleColors: ['#f8c5be', '#c94f52', '#ff8a8a', '#ffffff'],
    powerUpColors: {
        rapidFire: '#00ff88',
        heal: '#4ade80',
        multiShot: '#fbbf24',
        shield: '#60a5fa'
    }
};

// Power-up types
const POWERUP_TYPES = {
    RAPID_FIRE: { name: 'Rapid Fire', duration: 5000, color: '#00ff88', icon: '⚡' },
    HEAL: { name: 'Heal', duration: 0, color: '#4ade80', icon: '💚' },
    MULTI_SHOT: { name: 'Triple Shot', duration: 6000, color: '#fbbf24', icon: '🔱' },
    SHIELD: { name: 'Shield', duration: 4000, color: '#60a5fa', icon: '🛡️' }
};

const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    LEVEL_COMPLETE: 'level_complete',
    GAME_OVER: 'game_over',
    SCIENCE_MODAL: 'science_modal'
};

// ============================================
// LEVEL CONFIGURATIONS
// ============================================
const LEVELS = [
    {
        name: "Steady Laminar Flow",
        description: "Basic hemodynamic stability training",
        spawnRate: 2500,
        clotSpeed: 0.8,
        clotHealth: 1,
        pulseCooldown: 800,
        targetScore: 500,
        bossLevel: false
    },
    {
        name: "Atrial Fibrillation",
        description: "Irregular flow patterns detected",
        spawnRate: 2000,
        clotSpeed: 1.2,
        clotHealth: 1,
        pulseCooldown: null, // Randomized
        pulseCooldownMin: 500,
        pulseCooldownMax: 1500,
        targetScore: 1000,
        bossLevel: false
    },
    {
        name: "Mechanical Stagnation",
        description: "Critical thrombus formation",
        spawnRate: 3000,
        clotSpeed: 0.6,
        clotHealth: 1,
        pulseCooldown: 600,
        targetScore: 2000,
        bossLevel: true,
        bossHealth: 10,
        bossSize: 80
    }
];

// ============================================
// PLAYER CLASS
// ============================================
class Player {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = 50;
        this.height = 30;
        this.x = canvas.width / 2;
        this.y = canvas.height - 80;
        this.targetX = this.x;
        this.lerpFactor = 0.12;
        this.pulseTime = 0;
    }

    update(deltaTime) {
        // Smooth lerp movement
        this.x = lerp(this.x, this.targetX, this.lerpFactor);

        // Clamp position
        const halfWidth = this.width / 2;
        this.x = Math.max(halfWidth, Math.min(this.canvas.width - halfWidth, this.x));

        this.pulseTime += deltaTime;
    }

    setTarget(x) {
        this.targetX = x;
    }

    draw(ctx) {
        const pulseScale = 1 + Math.sin(this.pulseTime * 0.005) * 0.03;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(pulseScale, pulseScale);

        // Valve leaflet shape
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.bezierCurveTo(
            -this.width / 2, -this.height / 3,
            -this.width / 2, this.height / 3,
            0, this.height / 2
        );
        ctx.bezierCurveTo(
            this.width / 2, this.height / 3,
            this.width / 2, -this.height / 3,
            0, -this.height / 2
        );
        ctx.closePath();

        // Gradient fill
        const gradient = ctx.createLinearGradient(0, -this.height / 2, 0, this.height / 2);
        gradient.addColorStop(0, COLORS.primaryLight);
        gradient.addColorStop(0.5, COLORS.primary);
        gradient.addColorStop(1, COLORS.primaryDark);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Outer glow
        ctx.shadowColor = COLORS.primary;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = COLORS.primaryLight;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Center detail
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.primaryLight;
        ctx.fill();

        ctx.restore();
    }

    getCollisionRadius() {
        return this.width / 2;
    }
}

// ============================================
// PULSE (PROJECTILE) CLASS
// ============================================
class Pulse {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 12;
        this.radius = 8;
        this.life = 1;
        this.trail = [];
    }

    update() {
        // Add trail point
        this.trail.push({ x: this.x, y: this.y, alpha: 1 });
        if (this.trail.length > 10) this.trail.shift();

        // Update trail
        this.trail.forEach(t => t.alpha *= 0.85);

        this.y -= this.speed;
        return this.y > -this.radius;
    }

    draw(ctx) {
        // Draw trail
        this.trail.forEach((t, i) => {
            ctx.beginPath();
            ctx.arc(t.x, t.y, this.radius * 0.6 * (i / this.trail.length), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(248, 197, 190, ${t.alpha * 0.5})`;
            ctx.fill();
        });

        // Main pulse
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, COLORS.primaryLight);
        gradient.addColorStop(1, COLORS.primary);
        ctx.fillStyle = gradient;

        ctx.shadowColor = COLORS.primary;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ============================================
// CLOT (ENEMY) CLASS - Chicken Invaders Style
// Starts big, shrinks with each hit until destroyed
// ============================================
class Clot {
    constructor(x, y, difficultyMultiplier = 1.0) {
        this.x = x;
        this.y = y;
        // Larger clots for more satisfying hits
        this.baseRadius = 45 + Math.random() * 35;
        this.radius = this.baseRadius;
        this.minRadius = 10;
        this.shrinkAmount = 5 + Math.random() * 3;
        // Faster base speed, scales more with difficulty
        this.speed = (0.4 + Math.random() * 0.4) * (1 + (difficultyMultiplier - 1) * 0.7);
        this.residenceTime = 0;
        this.wobbleOffset = Math.random() * 1000;
        this.hitFlash = 0;
        this.difficultyMultiplier = difficultyMultiplier;
        this.vx = (Math.random() - 0.5) * 0.5;
        // Fibrin strands for realistic look
        this.fibrinStrands = [];
        for (let i = 0; i < 5 + Math.floor(Math.random() * 4); i++) {
            this.fibrinStrands.push({
                angle: Math.random() * Math.PI * 2,
                length: 0.3 + Math.random() * 0.4,
                width: 1 + Math.random() * 2
            });
        }
        // Platelet clusters
        this.platelets = [];
        for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
            this.platelets.push({
                x: (Math.random() - 0.5) * 0.6,
                y: (Math.random() - 0.5) * 0.6,
                size: 0.1 + Math.random() * 0.15
            });
        }
        // Drop power-up chance
        this.dropsPowerUp = Math.random() < 0.15; // 15% chance
    }

    update(deltaTime, canvasWidth) {
        this.y += this.speed;
        this.x += this.vx;
        this.residenceTime += deltaTime;

        // Bounce off walls
        if (this.x < this.radius || this.x > canvasWidth - this.radius) {
            this.vx *= -1;
        }
        this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));

        // Hit flash decay
        if (this.hitFlash > 0) this.hitFlash -= deltaTime * 0.01;
    }

    hit() {
        this.hitFlash = 1;
        // Shrink the clot
        this.radius -= this.shrinkAmount;
        // Return true if destroyed (too small)
        return this.radius <= this.minRadius;
    }

    getScale() {
        return this.radius / this.baseRadius;
    }

    draw(ctx, time) {
        const wobblePoints = calculateWobble(time + this.wobbleOffset, this.radius);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw wobbly blob
        ctx.beginPath();
        ctx.moveTo(wobblePoints[0].x, wobblePoints[0].y);

        for (let i = 1; i < wobblePoints.length; i++) {
            const prev = wobblePoints[i - 1];
            const curr = wobblePoints[i];
            const next = wobblePoints[(i + 1) % wobblePoints.length];

            const cpx = curr.x;
            const cpy = curr.y;
            const nx = (curr.x + next.x) / 2;
            const ny = (curr.y + next.y) / 2;

            ctx.quadraticCurveTo(cpx, cpy, nx, ny);
        }
        ctx.closePath();

        // Gradient fill
        const colorIndex = Math.floor((time + this.wobbleOffset) * 0.001) % COLORS.clotColors.length;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);

        if (this.hitFlash > 0) {
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.5, '#ffaaaa');
            gradient.addColorStop(1, COLORS.primary);
        } else {
            gradient.addColorStop(0, COLORS.clotColors[0]);
            gradient.addColorStop(0.5, COLORS.clotColors[1]);
            gradient.addColorStop(1, COLORS.clotColors[2]);
        }

        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw fibrin strands for realistic clot look
        ctx.strokeStyle = 'rgba(139, 30, 35, 0.6)';
        this.fibrinStrands.forEach(strand => {
            ctx.lineWidth = strand.width;
            ctx.beginPath();
            const startX = Math.cos(strand.angle) * this.radius * 0.3;
            const startY = Math.sin(strand.angle) * this.radius * 0.3;
            const endX = Math.cos(strand.angle) * this.radius * strand.length;
            const endY = Math.sin(strand.angle) * this.radius * strand.length;
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        });

        // Draw platelet clusters
        this.platelets.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x * this.radius, p.y * this.radius, this.radius * p.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(248, 197, 190, 0.5)';
            ctx.fill();
        });

        // Pulsing outline
        ctx.strokeStyle = COLORS.primaryDark;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }
}

// ============================================
// POWER-UP CLASS - Drops from destroyed clots
// ============================================
class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 18;
        this.speed = 1.5;
        // Random power-up type
        const types = Object.keys(POWERUP_TYPES);
        this.typeKey = types[Math.floor(Math.random() * types.length)];
        this.type = POWERUP_TYPES[this.typeKey];
        this.rotation = 0;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    update(deltaTime) {
        this.y += this.speed;
        this.rotation += deltaTime * 0.003;
        this.pulsePhase += deltaTime * 0.005;
        return this.y < 1000; // Remove if off screen
    }

    draw(ctx, time) {
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(pulse, pulse);

        // Glow effect
        ctx.shadowColor = this.type.color;
        ctx.shadowBlur = 20;

        // Outer ring
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.type.color;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner fill
        ctx.fillStyle = this.type.color + '40';
        ctx.fill();

        // Icon
        ctx.shadowBlur = 0;
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.type.icon, 0, 0);

        ctx.restore();
    }
}

// ============================================
// MAIN GAME CLASS
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Game objects
        this.player = new Player(this.canvas);
        this.pulses = [];
        this.clots = [];
        this.powerUps = []; // Power-up drops

        // Systems
        this.particles = new ParticleSystem();
        this.crs = new CRSCalculator();
        this.hud = new HUD(this.canvas);
        this.screenShake = new ScreenShake();
        this.levelTransition = new LevelTransition();
        this.overlays = new OverlayController();

        // Game state
        this.state = GAME_STATES.MENU;
        this.level = 0;
        this.score = 0;
        this.pulseCooldown = 0;
        this.spawnTimer = 0;
        this.lastTime = 0;
        this.gameTime = 0;
        this.wasCritical = false;

        // Dynamic difficulty - increases every 5 seconds (faster!)
        this.difficultyTimer = 0;
        this.difficultyLevel = 0;
        this.difficultyMultiplier = 1.0;

        // Combo system
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;

        // Active power-ups
        this.activePowerUps = {
            rapidFire: 0,
            multiShot: 0,
            shield: 0
        };

        // Input
        this.setupInput();
        this.setupButtons();

        // Start game loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    resize() {
        const container = document.getElementById('game-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;

        if (this.player) {
            this.player.canvas = this.canvas;
            this.player.y = this.canvas.height - 80;
        }
    }

    setupInput() {
        // Touch controls
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e), { passive: false });

        // Mouse controls
        this.canvas.addEventListener('mousemove', (e) => this.handleMouse(e));
        this.canvas.addEventListener('click', () => this.fire());

        // Prevent default behaviors
        document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }

    handleTouch(e) {
        e.preventDefault();
        if (this.state !== GAME_STATES.PLAYING) return;

        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);

        this.player.setTarget(x);

        if (e.type === 'touchstart') {
            this.fire();
        }
    }

    handleMouse(e) {
        if (this.state !== GAME_STATES.PLAYING) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);

        this.player.setTarget(x);
    }

    fire() {
        if (this.state !== GAME_STATES.PLAYING) return;
        // Limit max pulses on screen
        if (this.pulses.length < 20) {
            // Multi-shot power-up: fire 3 shots
            if (this.activePowerUps.multiShot > 0) {
                this.pulses.push(new Pulse(this.player.x - 15, this.player.y - this.player.height / 2));
                this.pulses.push(new Pulse(this.player.x, this.player.y - this.player.height / 2));
                this.pulses.push(new Pulse(this.player.x + 15, this.player.y - this.player.height / 2));
            } else {
                this.pulses.push(new Pulse(this.player.x, this.player.y - this.player.height / 2));
            }
        }
    }

    setupButtons() {
        document.getElementById('start-btn')?.addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn')?.addEventListener('click', () => this.startGame());
        document.getElementById('next-level-btn')?.addEventListener('click', () => this.nextLevel());
        document.getElementById('close-modal-btn')?.addEventListener('click', () => this.closeModal());
    }

    startGame() {
        this.state = GAME_STATES.PLAYING;
        this.level = 0;
        this.score = 0;
        this.pulses = [];
        this.clots = [];
        this.powerUps = [];
        this.crs.reset();
        this.spawnTimer = 0;
        this.pulseCooldown = 0;
        this.wasCritical = false;
        this.difficultyTimer = 0;
        this.difficultyLevel = 0;
        this.difficultyMultiplier = 1.0;
        // Reset combos and power-ups
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.activePowerUps = { rapidFire: 0, multiShot: 0, shield: 0 };
        this.overlays.hideAll();
    }

    nextLevel() {
        this.level++;
        if (this.level >= LEVELS.length) {
            // Game complete!
            this.state = GAME_STATES.SCIENCE_MODAL;
            this.overlays.showScienceModal();
        } else {
            this.state = GAME_STATES.PLAYING;
            this.clots = [];
            this.pulses = [];
            this.spawnTimer = 0;
            this.difficultyTimer = 0;
            this.difficultyLevel = 0;
            this.difficultyMultiplier = 1.0;
            this.overlays.hideAll();
        }
    }

    closeModal() {
        this.state = GAME_STATES.MENU;
        this.overlays.showStart();
    }

    spawnClot() {
        const x = 30 + Math.random() * (this.canvas.width - 60);
        const y = -80; // Start further up for big clots
        this.clots.push(new Clot(x, y, this.difficultyMultiplier));
    }

    update(deltaTime) {
        if (this.state !== GAME_STATES.PLAYING) return;

        this.gameTime += deltaTime;

        // Update difficulty every 5 seconds (2x faster!)
        this.difficultyTimer += deltaTime;
        const newDifficultyLevel = Math.floor(this.difficultyTimer / 5000); // Every 5 seconds now!
        if (newDifficultyLevel > this.difficultyLevel) {
            this.difficultyLevel = newDifficultyLevel;
            // Faster multiplier increase: 1.0 -> 1.4 -> 1.8 -> 2.2 -> etc.
            this.difficultyMultiplier = 1.0 + (this.difficultyLevel * 0.4);
            // Cap at 4x difficulty
            this.difficultyMultiplier = Math.min(this.difficultyMultiplier, 4.0);
            // Screen shake on difficulty increase
            this.screenShake.trigger(5);
        }

        // Update player
        this.player.update(deltaTime);

        // Auto-fire while playing
        this.autoFireTimer = (this.autoFireTimer || 0) + deltaTime;
        const fireRate = this.activePowerUps.rapidFire > 0 ? 75 : 120; // Faster fire rate, even faster with power-up
        if (this.autoFireTimer >= fireRate) {
            this.fire();
            this.autoFireTimer = 0;
        }

        // Update pulses
        this.pulses = this.pulses.filter(pulse => pulse.update());

        // Spawn clots - faster with difficulty
        this.spawnTimer += deltaTime;
        const baseSpawnRate = 2500; // Faster spawn for more action
        const adjustedSpawnRate = baseSpawnRate / this.difficultyMultiplier;
        if (this.spawnTimer >= adjustedSpawnRate) {
            this.spawnClot();
            this.spawnTimer = 0;
            // Spawn extra clots at higher difficulty
            if (this.difficultyLevel >= 3 && Math.random() < 0.3) {
                this.spawnClot();
            }
            if (this.difficultyLevel >= 5 && Math.random() < 0.25) {
                this.spawnClot();
            }
        }

        // Update clots
        this.clots.forEach(clot => clot.update(deltaTime, this.canvas.width));

        // Check collisions
        this.checkCollisions();

        // Remove clots that passed the screen - BIG CRS PENALTY
        this.clots = this.clots.filter(clot => {
            if (clot.y > this.canvas.height + clot.radius) {
                // Clot escaped - MAJOR CRS penalty (25-40 based on size)
                const penalty = 25 + (clot.getScale() * 15);
                this.crs.crsValue += penalty;
                // Screen shake on escape
                this.screenShake.trigger(8);
                return false;
            }
            return true;
        });

        // Update CRS
        this.crs.update(this.clots, deltaTime);

        // Check for critical CRS - visual warning
        const container = document.getElementById('game-container');
        if (this.crs.isCritical()) {
            container?.classList.add('critical');
            if (!this.wasCritical) {
                this.screenShake.trigger(15);
                this.wasCritical = true;
            }
        } else {
            container?.classList.remove('critical');
            this.wasCritical = false;
        }

        // Check for game over
        if (this.crs.isFailed()) {
            this.state = GAME_STATES.GAME_OVER;
            container?.classList.remove('critical');
            const survivalTime = Math.floor(this.difficultyTimer / 1000);
            this.overlays.showGameOver(this.score, survivalTime);
        }

        // Infinite mode - no level completion check
        // Game continues until CRS fails

        // Update power-ups
        this.powerUps = this.powerUps.filter(pu => pu.update(deltaTime));

        // Check power-up collection
        this.powerUps = this.powerUps.filter(pu => {
            const dx = pu.x - this.player.x;
            const dy = pu.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < pu.radius + 30) {
                // Collected!
                this.applyPowerUp(pu.typeKey);
                this.particles.emit(pu.x, pu.y, 15, [pu.type.color, '#ffffff']);
                this.screenShake.trigger(3);
                return false;
            }
            return true;
        });

        // Update combo timer
        if (this.combo > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.combo = 0; // Combo expired
            }
        }

        // Update active power-up timers
        for (const key in this.activePowerUps) {
            if (this.activePowerUps[key] > 0) {
                this.activePowerUps[key] -= deltaTime;
            }
        }

        // Update particles
        this.particles.update();

        // Update UI
        this.hud.update(deltaTime);
        this.screenShake.update();
        this.levelTransition.update(deltaTime);
    }

    checkCollisions() {
        const pulsesToRemove = new Set();
        const clotsToRemove = new Set();

        this.pulses.forEach((pulse, pi) => {
            this.clots.forEach((clot, ci) => {
                if (circleCollision(pulse.x, pulse.y, pulse.radius, clot.x, clot.y, clot.radius)) {
                    pulsesToRemove.add(pi);

                    // Particles on hit
                    this.particles.emit(pulse.x, pulse.y, 4, COLORS.particleColors);

                    // Combo system - increase combo on hit
                    this.combo++;
                    this.comboTimer = 1500; // 1.5 second combo window
                    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

                    // Score with combo multiplier!
                    const comboBonus = Math.min(this.combo, 10); // Max 10x
                    this.score += 5 * comboBonus;

                    if (clot.hit()) {
                        // Clot destroyed!
                        clotsToRemove.add(ci);

                        // Big bonus with combo
                        this.score += 50 * comboBonus;
                        this.crs.onClotDestroyed(clot.getScale());

                        // Spawn power-up if clot drops one
                        if (clot.dropsPowerUp) {
                            this.powerUps.push(new PowerUp(clot.x, clot.y));
                        }

                        // Big particle burst
                        this.particles.emit(clot.x, clot.y, 30, COLORS.particleColors);

                        // Screen shake on destroy
                        this.screenShake.trigger(4);
                    }
                }
            });
        });

        // Remove destroyed objects
        this.pulses = this.pulses.filter((_, i) => !pulsesToRemove.has(i));
        this.clots = this.clots.filter((_, i) => !clotsToRemove.has(i));
    }

    applyPowerUp(typeKey) {
        switch (typeKey) {
            case 'RAPID_FIRE':
                this.activePowerUps.rapidFire = POWERUP_TYPES.RAPID_FIRE.duration;
                break;
            case 'HEAL':
                this.crs.crsValue = Math.max(0, this.crs.crsValue - 25);
                break;
            case 'MULTI_SHOT':
                this.activePowerUps.multiShot = POWERUP_TYPES.MULTI_SHOT.duration;
                break;
            case 'SHIELD':
                this.activePowerUps.shield = POWERUP_TYPES.SHIELD.duration;
                break;
        }
        this.score += 100; // Bonus for collecting power-up
    }

    levelComplete() {
        this.state = GAME_STATES.LEVEL_COMPLETE;
        const levelName = LEVELS[this.level].name + " Stabilized";
        this.overlays.showLevelComplete(levelName);
    }

    draw() {
        const ctx = this.ctx;
        const shake = this.screenShake.getOffset();

        ctx.save();
        ctx.translate(shake.x, shake.y);

        // Clear with background
        this.drawBackground();

        // Draw game objects
        this.clots.forEach(clot => clot.draw(ctx, this.gameTime));
        this.powerUps.forEach(pu => pu.draw(ctx, this.gameTime)); // Draw power-ups
        this.pulses.forEach(pulse => pulse.draw(ctx));
        this.player.draw(ctx);
        this.particles.draw(ctx);

        // Draw combo indicator
        if (this.combo > 1) {
            this.drawCombo(ctx);
        }

        // Draw active power-up indicators
        this.drawActivePowerUps(ctx);

        // Draw HUD
        const survivalTime = Math.floor(this.difficultyTimer / 1000);
        this.hud.draw(this.score, survivalTime, this.crs.getCRSPercentage());

        // Level transition
        this.levelTransition.draw(ctx, this.canvas.width, this.canvas.height);

        ctx.restore();
    }

    drawCombo(ctx) {
        const comboSize = Math.min(this.combo, 10);
        const scale = 1 + (comboSize * 0.05);

        ctx.save();
        ctx.translate(this.canvas.width / 2, 100);
        ctx.scale(scale, scale);

        // Combo text
        ctx.font = 'bold 24px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = `hsl(${60 - comboSize * 5}, 100%, 60%)`;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.fillText(`${comboSize}x COMBO!`, 0, 0);
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    drawActivePowerUps(ctx) {
        let y = 130;
        const x = this.canvas.width / 2;

        ctx.font = '14px Rajdhani, sans-serif';
        ctx.textAlign = 'center';

        if (this.activePowerUps.rapidFire > 0) {
            ctx.fillStyle = POWERUP_TYPES.RAPID_FIRE.color;
            ctx.fillText(`⚡ RAPID FIRE ${Math.ceil(this.activePowerUps.rapidFire / 1000)}s`, x, y);
            y += 18;
        }
        if (this.activePowerUps.multiShot > 0) {
            ctx.fillStyle = POWERUP_TYPES.MULTI_SHOT.color;
            ctx.fillText(`🔱 TRIPLE SHOT ${Math.ceil(this.activePowerUps.multiShot / 1000)}s`, x, y);
            y += 18;
        }
        if (this.activePowerUps.shield > 0) {
            ctx.fillStyle = POWERUP_TYPES.SHIELD.color;
            ctx.fillText(`🛡️ SHIELD ${Math.ceil(this.activePowerUps.shield / 1000)}s`, x, y);
        }
    }

    drawBackground() {
        const ctx = this.ctx;

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0d0505');
        gradient.addColorStop(0.5, '#1a0a0a');
        gradient.addColorStop(1, '#0d0505');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Subtle grid
        ctx.strokeStyle = 'rgba(201, 79, 82, 0.05)';
        ctx.lineWidth = 1;
        const gridSize = 40;

        for (let x = 0; x < this.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }

        for (let y = 0; y < this.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }

        // Pulsing center glow
        const pulseAlpha = 0.03 + Math.sin(this.gameTime * 0.002) * 0.02;
        const centerGradient = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width
        );
        centerGradient.addColorStop(0, `rgba(201, 79, 82, ${pulseAlpha})`);
        centerGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = centerGradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Cap delta time to prevent spiral of death
        const cappedDelta = Math.min(deltaTime, 32);

        this.update(cappedDelta);
        this.draw();

        requestAnimationFrame((t) => this.gameLoop(t));
    }
}

// ============================================
// INITIALIZATION
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
