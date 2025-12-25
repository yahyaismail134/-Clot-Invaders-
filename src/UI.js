/**
 * UI.js - HUD, Bars, Level Transitions, and Screen Effects
 * Handles all visual UI elements rendered on the canvas
 */

// ============================================
// COLOR PALETTE
// ============================================
const COLORS = {
    primary: '#c94f52',
    primaryLight: '#f8c5be',
    primaryDark: '#a2272c',
    bgDark: '#1a0a0a',
    textLight: '#fff5f5',
    textMuted: '#d4a5a5',
    danger: '#ff3333',
    success: '#4ade80',
    warning: '#fbbf24'
};

// ============================================
// HUD RENDERER
// ============================================
export class HUD {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.padding = 15;
        this.barHeight = 12;
        this.pulseTime = 0;
    }

    update(deltaTime) {
        this.pulseTime += deltaTime;
    }

    draw(score, survivalTime, crsPercentage) {
        this.drawCRSBar(crsPercentage);
        this.drawScore(score);
        this.drawTime(survivalTime);
        this.drawStagnationZones();
    }

    drawCRSBar(percentage) {
        const ctx = this.ctx;
        const width = this.canvas.width - this.padding * 2;
        const x = this.padding;
        const y = this.padding;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(x, y, width, this.barHeight + 8, 6);
        ctx.fill();

        // Label
        ctx.font = 'bold 10px Rajdhani, sans-serif';
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText('CRS', x + 5, y + this.barHeight + 3);

        // Bar background
        const barX = x + 30;
        const barWidth = width - 70;
        ctx.fillStyle = 'rgba(162, 39, 44, 0.3)';
        ctx.beginPath();
        ctx.roundRect(barX, y + 2, barWidth, this.barHeight, 4);
        ctx.fill();

        // Bar fill with gradient
        const fillWidth = (barWidth * Math.min(percentage, 100)) / 100;
        if (fillWidth > 0) {
            const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);

            if (percentage < 50) {
                gradient.addColorStop(0, COLORS.primaryLight);
                gradient.addColorStop(1, COLORS.primary);
            } else if (percentage < 70) {
                gradient.addColorStop(0, COLORS.primary);
                gradient.addColorStop(1, COLORS.warning);
            } else {
                gradient.addColorStop(0, COLORS.warning);
                gradient.addColorStop(1, COLORS.danger);
            }

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(barX, y + 2, fillWidth, this.barHeight, 4);
            ctx.fill();

            // Glow effect for critical
            if (percentage >= 70) {
                const pulseAlpha = 0.3 + Math.sin(this.pulseTime * 0.01) * 0.2;
                ctx.shadowColor = COLORS.danger;
                ctx.shadowBlur = 15;
                ctx.fillStyle = `rgba(255, 51, 51, ${pulseAlpha})`;
                ctx.beginPath();
                ctx.roundRect(barX, y + 2, fillWidth, this.barHeight, 4);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        // Percentage text
        ctx.font = 'bold 11px Orbitron, sans-serif';
        ctx.fillStyle = percentage >= 70 ? COLORS.danger : COLORS.textLight;
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.floor(percentage)}%`, x + width - 5, y + this.barHeight + 2);
        ctx.textAlign = 'left';
    }

    drawScore(score) {
        const ctx = this.ctx;
        const x = this.padding;
        const y = this.padding + this.barHeight + 25;

        ctx.font = 'bold 11px Rajdhani, sans-serif';
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText('SCORE', x, y);

        ctx.font = 'bold 20px Orbitron, sans-serif';
        ctx.fillStyle = COLORS.primaryLight;
        ctx.fillText(score.toString().padStart(6, '0'), x, y + 20);
    }

    drawTime(seconds) {
        const ctx = this.ctx;
        const x = this.canvas.width - this.padding;
        const y = this.padding + this.barHeight + 25;

        ctx.textAlign = 'right';
        ctx.font = 'bold 11px Rajdhani, sans-serif';
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText('TIME', x, y);

        // Format as MM:SS
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

        ctx.font = 'bold 18px Orbitron, sans-serif';
        ctx.fillStyle = COLORS.primary;
        ctx.fillText(timeStr, x, y + 20);
        ctx.textAlign = 'left';
    }

    drawPulseCooldown(current, max) {
        const ctx = this.ctx;
        const size = 40;
        const x = this.canvas.width / 2;
        const y = this.canvas.height - 60;

        // Background circle
        ctx.beginPath();
        ctx.arc(x, y, size / 2 + 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        // Cooldown arc
        const progress = 1 - (current / max);
        ctx.beginPath();
        ctx.arc(x, y, size / 2, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.strokeStyle = progress >= 1 ? COLORS.success : COLORS.primary;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Center icon
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = progress >= 1 ? COLORS.success : COLORS.primaryLight;
        ctx.fillText('💓', x, y);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
    }

    drawStagnationZones() {
        const ctx = this.ctx;
        const zoneWidth = this.canvas.width * 0.15;
        const alpha = 0.1 + Math.sin(this.pulseTime * 0.003) * 0.05;

        // Left zone
        const leftGradient = ctx.createLinearGradient(0, 0, zoneWidth, 0);
        leftGradient.addColorStop(0, `rgba(162, 39, 44, ${alpha})`);
        leftGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = leftGradient;
        ctx.fillRect(0, 0, zoneWidth, this.canvas.height);

        // Right zone
        const rightGradient = ctx.createLinearGradient(this.canvas.width - zoneWidth, 0, this.canvas.width, 0);
        rightGradient.addColorStop(0, 'transparent');
        rightGradient.addColorStop(1, `rgba(162, 39, 44, ${alpha})`);
        ctx.fillStyle = rightGradient;
        ctx.fillRect(this.canvas.width - zoneWidth, 0, zoneWidth, this.canvas.height);
    }
}

// ============================================
// SCREEN SHAKE CONTROLLER
// ============================================
export class ScreenShake {
    constructor() {
        this.intensity = 0;
        this.decay = 0.9;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    trigger(intensity = 10) {
        this.intensity = intensity;
        // Also trigger CSS shake
        const container = document.getElementById('game-container');
        if (container) {
            container.classList.add('shake');
            setTimeout(() => container.classList.remove('shake'), 300);
        }
    }

    update() {
        if (this.intensity > 0.5) {
            this.offsetX = (Math.random() - 0.5) * this.intensity * 2;
            this.offsetY = (Math.random() - 0.5) * this.intensity * 2;
            this.intensity *= this.decay;
        } else {
            this.offsetX = 0;
            this.offsetY = 0;
            this.intensity = 0;
        }
    }

    getOffset() {
        return { x: this.offsetX, y: this.offsetY };
    }
}

// ============================================
// LEVEL TRANSITION EFFECTS
// ============================================
export class LevelTransition {
    constructor() {
        this.active = false;
        this.progress = 0;
        this.fadeIn = true;
    }

    start() {
        this.active = true;
        this.progress = 0;
        this.fadeIn = true;
    }

    update(deltaTime) {
        if (!this.active) return;

        this.progress += deltaTime * 0.002;

        if (this.progress >= 1) {
            this.active = false;
            this.progress = 0;
        }
    }

    draw(ctx, width, height) {
        if (!this.active) return;

        let alpha;
        if (this.progress < 0.5) {
            alpha = this.progress * 2;
        } else {
            alpha = 1 - (this.progress - 0.5) * 2;
        }

        ctx.fillStyle = `rgba(26, 10, 10, ${alpha})`;
        ctx.fillRect(0, 0, width, height);
    }

    isActive() {
        return this.active;
    }
}

// ============================================
// OVERLAY CONTROLLER
// ============================================
export class OverlayController {
    constructor() {
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.levelCompleteScreen = document.getElementById('level-complete-screen');
        this.scienceModal = document.getElementById('science-modal');
    }

    hideAll() {
        this.startScreen?.classList.remove('active');
        this.gameOverScreen?.classList.remove('active');
        this.levelCompleteScreen?.classList.remove('active');
        this.scienceModal?.classList.remove('active');
    }

    showStart() {
        this.hideAll();
        this.startScreen?.classList.add('active');
    }

    showGameOver(score, survivalTime) {
        this.hideAll();
        const scoreEl = document.getElementById('final-score-value');
        const timeEl = document.getElementById('final-level-value');
        if (scoreEl) scoreEl.textContent = score;
        if (timeEl) {
            const mins = Math.floor(survivalTime / 60);
            const secs = survivalTime % 60;
            timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        this.gameOverScreen?.classList.add('active');
    }

    showLevelComplete(levelName) {
        this.hideAll();
        const nameEl = document.getElementById('level-name');
        if (nameEl) nameEl.textContent = levelName;
        this.levelCompleteScreen?.classList.add('active');
    }

    showScienceModal() {
        this.hideAll();
        this.scienceModal?.classList.add('active');
    }
}
