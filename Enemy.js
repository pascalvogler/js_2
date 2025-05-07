import { NPC } from './NPC.js';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, ENEMY_DATA, NUM_ENEMIES, AGGRO_RADIUS } from './Constants.js';

export class Enemy extends NPC {
    constructor(x, y, enemyType, hp, letter) {
        super(x, y, enemyType, hp, '#FF0000'); // All enemies are red
        this.enemyType = enemyType;
        this.letter = letter;
        this.isAggroed = false;
        this.wasMoving = false; // Track if enemy was moving before aggro
        this.savedTime = 0; // Save elapsed time when aggroed
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
                    !game.monsters.some(m => m.x === x && m.y === y);
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
            const hp = Math.floor(Math.random() * (hpMax - hpMin + 1)) + hpMin;

            enemies.push(new Enemy(x, y, enemyType, hp, letter));
        }
        return enemies;
    }

    update(deltaTime, player, game) {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const previousAggroState = this.isAggroed;
        this.isAggroed = distance <= AGGRO_RADIUS;

        if (this.isAggroed) {
            if (!previousAggroState) {
                // Just entered aggro range: save state
                this.wasMoving = this.state === 'moving';
                this.savedTime = this.currentTime;
                this.state = 'paused';
                this.currentTime = 0;
            }
        } else {
            if (previousAggroState) {
                // Just left aggro range: restore state
                this.currentTime = this.savedTime;
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

        // Draw "!" if aggroed
        if (this.isAggroed) {
            context.fillStyle = 'yellow';
            context.font = 'bold 40px Impact';
            context.fillText('!', this.x + this.width / 2, this.y - 10);
        }

        context.textAlign = 'left'; // Reset alignment
    }
}