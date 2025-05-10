import { NPC } from './NPC.js';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, ENEMY_DATA, NUM_ENEMIES, AGGRO_RADIUS, AGGRO_LOSE_RADIUS_MIN, AGGRO_LOSE_RADIUS_MAX, NPC_SPEED } from './Constants.js';

export class Enemy extends NPC {
    constructor(x, y, enemyType, hp, letter) {
        super(x, y, enemyType, hp, '#FF0000'); // All enemies are red
        this.enemyType = enemyType;
        this.letter = letter;
        this.isAggroed = false; // Initial aggro state
        this.walkSpeed = NPC_SPEED; // Base walking speed
        this.aggroTime = 0; // Track time since aggro started
        this.wasMoving = false; // Track if enemy was moving before aggro
        this.maxHp = hp; // Store max HP for health percentage calculation
        this.attackDamage = 2; // Enemy attack damage
        this.attackSpeed = 0.5; // Attacks per second (once every 2 seconds)
        this.attackRadius = 20; // Attack range in pixels
        this.lastAttackTime = 0; // Track the last time this enemy attacked
        this.aggroLoseRadius = Math.floor(Math.random() * (AGGRO_LOSE_RADIUS_MAX - AGGRO_LOSE_RADIUS_MIN + 1)) + AGGRO_LOSE_RADIUS_MIN; // Random aggro lose range
        console.log(`Enemy ${enemyType} spawned with initial HP: ${hp}, max HP: ${this.maxHp}, aggroLoseRadius: ${this.aggroLoseRadius}`); // Log initial health and aggro lose radius
    }

    static spawn(game) {
        const enemies = [];
        const enemyTypes = Object.keys(ENEMY_DATA);
        const cumulativeProbabilities = [];
        let cumulative = 0;
        for (let type of enemyTypes) {
            cumulative += ENEMY_DATA[type].probability;
            cumulativeProbabilities.push({ type, threshold: cumulative });
        }

        for (let i = 0; i < NUM_ENEMIES; i++) {
            let x, y;
            let isValidPosition;
            do {
                x = Math.floor(Math.random() * MAP_WIDTH / TILE_SIZE) * TILE_SIZE;
                y = Math.floor(Math.random() * MAP_HEIGHT / TILE_SIZE) * TILE_SIZE;
                isValidPosition = game.isWalkable(x, y, TILE_SIZE, TILE_SIZE) &&
                    !enemies.some(e => e.x === x && e.y === y) &&
                    !game.oreDeposits.some(d => d.x === x && d.y === y) &&
                    !game.monsters.some(m => m.x === x && m.y === y) &&
                    !game.enemies.some(e => e.x === x && e.y === y);
            } while (!isValidPosition);

            const rand = Math.random() * 100;
            let enemyType = enemyTypes[0];
            for (let { type, threshold } of cumulativeProbabilities) {
                if (rand <= threshold) {
                    enemyType = type;
                    break;
                }
            }

            const { hpMin, hpMax, letter } = ENEMY_DATA[enemyType];
            const hp = Math.floor(Math.random() * (hpMax - hpMin + 1)) + hpMin; // Individual health roll

            enemies.push(new Enemy(x, y, enemyType, hp, letter));
        }
        return enemies;
    }

    takeDamage(damage, game) {
        this.hp -= damage;
        console.log(`Enemy ${this.enemyType} took ${damage} damage, current HP: ${this.hp}, max HP: ${this.maxHp}`); // Log damage taken
        if (this.hp <= 0) {
            // Award energy based on max HP (10% of max HP)
            const energyReward = Math.floor(this.maxHp * 0.1);
            game.player.totalEnergy += energyReward;
            console.log(`Enemy ${this.enemyType} defeated, awarded ${energyReward} energy`);
            // Remove enemy from game
            game.enemies = game.enemies.filter(enemy => enemy !== this);
        }
    }

    attackPlayer(player) {
        const currentTime = Date.now();
        const attackInterval = 1000 / this.attackSpeed; // Convert attacks per second to milliseconds (2000 ms)
        if (currentTime - this.lastAttackTime < attackInterval) return;

        player.takeDamage(this.attackDamage);
        this.lastAttackTime = currentTime;
        console.log(`Enemy ${this.enemyType} attacked player for ${this.attackDamage} damage`);
    }

    update(deltaTime, player, game) {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if player enters aggro radius
        if (distance <= AGGRO_RADIUS && !this.isAggroed) {
            this.isAggroed = true;
            this.aggroTime = Date.now(); // Record when aggro started
            this.wasMoving = this.state === 'moving';
        }

        if (this.isAggroed) {
            // Pursue player at 1.2x walk speed
            const speed = this.walkSpeed * 1.2 * (deltaTime / 1000);
            const angle = Math.atan2(dy, dx);
            const moveDx = Math.cos(angle) * speed;
            const moveDy = Math.sin(angle) * speed;
            this.move(game, moveDx, moveDy); // Use NPC move method with calculated direction

            // Attack player if within attack radius
            if (distance <= this.attackRadius) {
                this.attackPlayer(player);
            }

            // Lose aggro if player moves beyond aggroLoseRadius
            if (distance > this.aggroLoseRadius) {
                this.isAggroed = false;
                this.currentTime = Date.now(); // Reset currentTime to force a new wander direction
                if (this.wasMoving) {
                    this.state = 'moving';
                }
                console.log(`Enemy ${this.enemyType} lost aggro, distance: ${distance}, aggroLoseRadius: ${this.aggroLoseRadius}`);
            }
        } else {
            if (this.isAggroed) {
                // Reset to wandering if player leaves aggro radius
                this.isAggroed = false;
                this.currentTime = Date.now(); // Reset currentTime to force a new wander direction
                if (this.wasMoving) {
                    this.state = 'moving';
                }
            }
            this.wander(game, deltaTime);
        }
    }

    draw(context) {
        super.draw(context);

        // Draw the letter on the enemy
        context.fillStyle = 'white';
        context.font = 'bold 30px Impact';
        context.textAlign = 'center';
        context.fillText(this.letter, this.x + this.width / 2, this.y + this.height / 2 + 10);

        // Draw health bar just above the enemy with a 5-pixel gap
        const barHeight = 5;
        const barY = this.y - barHeight - 5; // 5 pixels above the enemy
        const barWidth = this.width;
        context.strokeStyle = 'black';
        context.lineWidth = 1;
        context.strokeRect(this.x, barY, barWidth, barHeight);
        context.fillStyle = 'red';
        const hpPercentage = this.hp / this.maxHp;
        context.fillRect(this.x, barY, barWidth * hpPercentage, barHeight);
        console.log(`Enemy ${this.enemyType} rendered with HP: ${this.hp}, max HP: ${this.maxHp}, percentage: ${hpPercentage}`); // Log render health

        // Draw "!" above health bar with a 5-pixel gap if aggroed
        if (this.isAggroed) {
            context.fillStyle = 'yellow';
            context.font = 'bold 40px Impact';
            context.fillText('!', this.x + this.width / 2, barY - 5); // 5 pixels above health bar
        }

        context.textAlign = 'left'; // Reset alignment
    }
}