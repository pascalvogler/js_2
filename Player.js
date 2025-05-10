import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, PLAYER_SPEED, MOVEMENT_TOLERANCE, PROGRESS_BAR_HEIGHT, PROGRESS_BAR_OFFSET, PLAYER_ATTACK_RADIUS, PLAYER_ATTACK_DAMAGE, PLAYER_ATTACK_SPEED, PLAYER_MULTISHOT_TARGETS } from './Constants.js';

export class Player {
    constructor(game) {
        this.game = game;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.speed = PLAYER_SPEED;
        this.totalEnergy = 0;
        this.hp = 20; // Starting health
        this.maxHp = 20; // Maximum health
        this.attackRadius = PLAYER_ATTACK_RADIUS;
        this.attackDamage = PLAYER_ATTACK_DAMAGE;
        this.attackSpeed = PLAYER_ATTACK_SPEED; // Attacks per second
        this.multishotTargets = PLAYER_MULTISHOT_TARGETS;
        this.lastAttackTime = 0; // Track the last time an attack was made
        this.isGameStarted = false; // Flag to delay initial attacks

        let startX, startY;
        do {
            startX = Math.floor(Math.random() * MAP_WIDTH / TILE_SIZE) * TILE_SIZE;
            startY = Math.floor(Math.random() * MAP_HEIGHT / TILE_SIZE) * TILE_SIZE;
        } while (!this.game.isWalkable(startX, startY));
        this.x = startX;
        this.y = startY;
    }

    takeDamage(damage) {
        this.hp -= damage;
        console.log(`Player took ${damage} damage, HP now ${this.hp}`);
        if (this.hp <= 0) {
            this.hp = 0;
            this.game.state = 'gameOver'; // Trigger game over state
        }
    }

    draw(context) {
        context.save();
        context.translate(-this.game.camera.x, -this.game.camera.y);
        context.fillStyle = 'white';
        context.fillRect(this.x, this.y, this.width, this.height);

        // Draw health bar above player with a 5-pixel gap
        const barHeight = 5;
        const barY = this.y - barHeight - 5; // 5 pixels above the player
        const barWidth = this.width;
        context.strokeStyle = 'black';
        context.lineWidth = 1;
        context.strokeRect(this.x, barY, barWidth, barHeight);
        context.fillStyle = 'green'; // Green for player health
        const hpPercentage = this.hp / this.maxHp;
        context.fillRect(this.x, barY, barWidth * hpPercentage, barHeight);

        if (this.game.mining.active && this.game.mining.ore) {
            const barWidth = this.width;
            const barHeight = PROGRESS_BAR_HEIGHT;
            const barX = this.x;
            const barY = this.y + this.height + PROGRESS_BAR_OFFSET;
            const currentTime = Date.now();
            const holdTime = (currentTime - this.game.mining.startTime) / 1000;
            const progress = Math.min(holdTime, 1);

            context.strokeStyle = 'black';
            context.lineWidth = 1;
            context.strokeRect(barX, barY, barWidth, barHeight);
            context.fillStyle = 'green';
            context.fillRect(barX, barY, barWidth * progress, barHeight);
        }

        context.restore();
    }

    update(deltaTime) {
        if (this.game.mining.active) return;

        const speed = this.speed * (deltaTime / 1000);
        const { dx, dy } = this.getMovementInput(speed);
        this.move(dx, dy);
        this.game.camera.update();

        // Automatic attack logic
        if (this.isGameStarted) {
            this.handleAutomaticAttack(deltaTime);
        }
    }

    getMovementInput(speed) {
        let dx = 0;
        let dy = 0;
        const movementKeys = ['w', 'a', 's', 'd'];

        if (this.game.keys.includes('a')) dx -= speed;
        if (this.game.keys.includes('d')) dx += speed;
        if (this.game.keys.includes('w')) dy -= speed;
        if (this.game.keys.includes('s')) dy += speed;

        const hasMovementKey = movementKeys.some(key => this.game.keys.includes(key));
        if (!hasMovementKey) {
            dx = 0;
            dy = 0;
        }

        return { dx, dy };
    }

    move(dx, dy) {
        let newX = this.x;
        let newY = this.y;

        if (dx !== 0) {
            newX += dx;
            const { x } = this.getValidPosition(newX, this.y, dx, dy);
            newX = x;
        }
        if (dy !== 0) {
            newY += dy;
            const { y } = this.getValidPosition(newX, newY, dx, dy);
            newY = y;
        }

        const tolerance = MOVEMENT_TOLERANCE;
        if (Math.abs(newX - this.x) < tolerance) newX = this.x;
        if (Math.abs(newY - this.y) < tolerance) newY = this.y;

        this.x = newX;
        this.y = newY;
    }

    getValidPosition(x, y, dx, dy) {
        // Clamp to map boundaries
        if (x < 0) x = 0;
        if (x + this.width > this.game.mapWidth) x = this.game.mapWidth - this.width;
        if (y < 0) y = 0;
        if (y + this.height > this.game.mapHeight) y = this.game.mapHeight - this.height;

        // Check tile collisions
        const startCol = Math.floor(x / this.game.tileSize);
        const endCol = Math.floor((x + this.width - 1) / this.game.tileSize);
        const startRow = Math.floor(y / this.game.tileSize);
        const endRow = Math.floor((y + this.height - 1) / this.game.tileSize);

        const isTileWalkable = (r, c) => {
            if (r < 0 || r >= this.game.mapRows || c < 0 || c >= this.game.mapCols || !this.game.map[r] || typeof this.game.map[r][c] === 'undefined') return false;
            console.log(`Checking tile at row=${r}, col=${c}, value=${this.game.map[r][c]}`);
            return this.game.map[r][c] === 0; // 0 is walkable, 1 (wall) and 2 (water) are not
        };

        // Check if the new position overlaps with any unwalkable tiles
        let tileCollision = false;
        let collidingTileValue = 0;
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                if (!isTileWalkable(row, col)) {
                    tileCollision = true;
                    collidingTileValue = this.game.map[row][col];
                    console.log(`Tile collision detected at row=${row}, col=${col}, value=${collidingTileValue}`);
                    break;
                }
            }
            if (tileCollision) break;
        }

        if (tileCollision) {
            console.log(`Resolving tile collision with value ${collidingTileValue}, dx=${dx}, dy=${dy}`);
            // If there's a collision, revert to the nearest valid position based on direction
            if (dx > 0) {
                // Moving right, find the nearest unwalkable tile's left edge
                for (let col = endCol; col >= startCol; col--) {
                    for (let row = startRow; row <= endRow; row++) {
                        if (!isTileWalkable(row, col)) {
                            x = col * this.game.tileSize - this.width;
                            console.log(`Snapped to left edge at x=${x} due to collision`);
                            break;
                        }
                    }
                }
            } else if (dx < 0) {
                // Moving left, find the nearest unwalkable tile's right edge
                for (let col = startCol; col <= endCol; col++) {
                    for (let row = startRow; row <= endRow; row++) {
                        if (!isTileWalkable(row, col)) {
                            x = (col + 1) * this.game.tileSize;
                            console.log(`Snapped to right edge at x=${x} due to collision`);
                            break;
                        }
                    }
                }
            }

            if (dy > 0) {
                // Moving down, find the nearest unwalkable tile's top edge
                for (let row = endRow; row >= startRow; row--) {
                    for (let col = startCol; col <= endCol; col++) {
                        if (!isTileWalkable(row, col)) {
                            y = row * this.game.tileSize - this.height;
                            console.log(`Snapped to top edge at y=${y} due to collision`);
                            break;
                        }
                    }
                }
            } else if (dy < 0) {
                // Moving up, find the nearest unwalkable tile's bottom edge
                for (let row = startRow; row <= endRow; row++) {
                    for (let col = startCol; col <= endCol; col++) {
                        if (!isTileWalkable(row, col)) {
                            y = (row + 1) * this.game.tileSize;
                            console.log(`Snapped to bottom edge at y=${y} due to collision`);
                            break;
                        }
                    }
                }
            }
        }

        // Check ore deposit collisions
        for (let deposit of this.game.oreDeposits) {
            const playerLeft = x;
            const playerRight = x + this.width;
            const playerTop = y;
            const playerBottom = y + this.height;
            const depositLeft = deposit.x;
            const depositRight = deposit.x + deposit.width;
            const depositTop = deposit.y;
            const depositBottom = deposit.y + deposit.height;

            if (playerRight > depositLeft && playerLeft < depositRight && playerBottom > depositTop && playerTop < depositBottom) {
                if (dx > 0) x = depositLeft - this.width;
                else if (dx < 0) x = depositRight;
                if (dy > 0) y = depositTop - this.height;
                else if (dy < 0) y = depositBottom;
                break;
            }
        }

        return { x, y };
    }

    handleAutomaticAttack(deltaTime) {
        console.log(`Player handleAutomaticAttack called, isGameStarted: ${this.isGameStarted}, time: ${Date.now()}`);
        // Check if enough time has passed to attack again
        const currentTime = Date.now();
        const attackInterval = 1000 / this.attackSpeed; // Convert attacks per second to milliseconds
        if (currentTime - this.lastAttackTime < attackInterval) return;

        // Find enemies within attack radius
        const enemiesInRange = [];
        for (let enemy of this.game.enemies) {
            const dx = (enemy.x + enemy.width / 2) - (this.x + this.width / 2);
            const dy = (enemy.y + enemy.height / 2) - (this.y + this.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= this.attackRadius) {
                enemiesInRange.push(enemy);
            }
        }
        console.log(`Enemies in range: ${enemiesInRange.length}, targets: ${enemiesInRange.map(e => e.enemyType).join(', ')}`);

        if (enemiesInRange.length === 0) return;

        // Randomly select up to multishotTargets enemies
        const targets = [];
        const numTargets = Math.min(this.multishotTargets, enemiesInRange.length);
        const availableEnemies = [...enemiesInRange];
        for (let i = 0; i < numTargets; i++) {
            if (availableEnemies.length === 0) break;
            const randomIndex = Math.floor(Math.random() * availableEnemies.length);
            targets.push(availableEnemies[randomIndex]);
            availableEnemies.splice(randomIndex, 1); // Remove selected enemy to avoid duplicates
        }

        // Attack the selected enemies
        for (let target of targets) {
            target.takeDamage(this.attackDamage, this.game);
        }

        this.lastAttackTime = currentTime;
    }

    // Set game started flag after initial setup
    startGame() {
        console.log(`Player startGame called, setting isGameStarted to true, time: ${Date.now()}`);
        this.isGameStarted = true;
    }
}