/**
 * Physics.js - Collision Detection & CRS Calculations
 * Handles soft-body physics, particle systems, and the CRS algorithm
 */

// ============================================
// PARTICLE SYSTEM
// ============================================
export class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 3;
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.02;
        this.size = 3 + Math.random() * 5;
        this.color = color;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15; // Gravity
        this.life -= this.decay;
        this.rotation += this.rotationSpeed;
        this.size *= 0.97;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, count, colors) {
        for (let i = 0; i < count; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push(new Particle(x, y, color));
        }
    }

    update() {
        this.particles = this.particles.filter(p => {
            p.update();
            return !p.isDead();
        });
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
}

// ============================================
// CRS ALGORITHM
// ============================================
export class CRSCalculator {
    constructor() {
        this.crsValue = 0;
        this.maxCRS = 100;
        this.recoveryRate = 5; // CRS reduction per successful hit
    }

    /**
     * CRS_total = Σ(ResidenceTime × ClotMass)
     * Where ClotMass is proportional to clot size
     */
    update(clots, deltaTime) {
        let crsIncrease = 0;

        clots.forEach(clot => {
            // ResidenceTime is tracked per clot
            // ClotMass is proportional to size (use getScale() if available, otherwise calculate from radius)
            const scale = clot.getScale ? clot.getScale() : (clot.radius / 50);
            const mass = scale * scale; // Squared for more dramatic effect
            const residenceContribution = mass * (deltaTime / 1000) * 2;
            crsIncrease += residenceContribution;
        });

        this.crsValue = Math.min(this.maxCRS, this.crsValue + crsIncrease);
    }

    onClotDestroyed(clotScale) {
        // Larger clots give more CRS reduction
        const reduction = this.recoveryRate * clotScale;
        this.crsValue = Math.max(0, this.crsValue - reduction);
    }

    getCRS() {
        return this.crsValue;
    }

    getCRSPercentage() {
        return (this.crsValue / this.maxCRS) * 100;
    }

    isCritical() {
        return this.crsValue >= 70;
    }

    isFailed() {
        return this.crsValue >= this.maxCRS;
    }

    reset() {
        this.crsValue = 0;
    }
}

// ============================================
// COLLISION DETECTION
// ============================================
export function circleCollision(x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < r1 + r2;
}

export function pointInCircle(px, py, cx, cy, r) {
    const dx = px - cx;
    const dy = py - cy;
    return (dx * dx + dy * dy) < r * r;
}

// ============================================
// STAGNATION ZONE DETECTION
// ============================================
export function isInStagnationZone(x, canvasWidth) {
    const zoneWidth = canvasWidth * 0.15; // 15% on each side
    return x < zoneWidth || x > canvasWidth - zoneWidth;
}

// ============================================
// SOFT BODY WOBBLE PHYSICS
// ============================================
export function calculateWobble(time, baseRadius, wobbleAmount = 0.1) {
    // Create organic wobble using multiple sine waves
    const wobblePoints = [];
    const segments = 12;

    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const wobble1 = Math.sin(time * 0.003 + angle * 2) * wobbleAmount;
        const wobble2 = Math.sin(time * 0.005 + angle * 3) * wobbleAmount * 0.5;
        const wobble3 = Math.sin(time * 0.002 + angle) * wobbleAmount * 0.3;

        const radiusModifier = 1 + wobble1 + wobble2 + wobble3;
        const radius = baseRadius * radiusModifier;

        wobblePoints.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        });
    }

    return wobblePoints;
}

// ============================================
// LERP UTILITIES
// ============================================
export function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

export function smoothStep(x) {
    return x * x * (3 - 2 * x);
}

export function easeOutQuad(t) {
    return t * (2 - t);
}
