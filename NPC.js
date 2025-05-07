import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, NPC_SPEED, MOVEMENT_TOLERANCE } from './Constants.js';

export class NPC {
    constructor(x, y, type, hp, color) {
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.type = type;
        this.hp = hp;
        this.color = color;
        this.speed = NPC_SPEED; // Use NPC_SPEED from Constants (50 pixels/second)

        // Wandering state
        this.state = 'moving'; // 'moving' or 'paused'
        this.angle = Math.random() * 2 * Math.PI; // Random angle in radians (0 to 2π)
        this.moveTime = this.getRandomMoveTime(); // Time to move (3-10 seconds)
        this.pauseTime = this.getRandomPauseTime(); // Time to pause (1-8 seconds)
        this.currentTime = 0; // Track elapsed time in current state
        console.log(`NPC ${this.type} initialized with state=${this.state}, angle=${this.angle}, moveTime=${this.moveTime}, pauseTime=${this.pauseTime}`);
    }

    getRandomMoveTime() {
        return Math.random() * (10 - 3) + 3; // Random between 3 and 10 seconds
    }

    getRandomPauseTime() {
        return Math.random() * (8 - 1) + 1; // Random between 1 and 8 seconds
    }

    getMovementInput(speed) {
        // Use the angle to compute dx and dy for omnidirectional movement
        const dx = speed * Math.cos(this.angle);
        const dy = speed * Math.sin(this.angle);
        return { dx, dy };
    }

    getValidPosition(game, x, y, dx, dy) {
        // Clamp to map boundaries
        if (x < 0) x = 0;
        if (x + this.width > MAP_WIDTH) x = MAP_WIDTH - this.width;
        if (y < 0) y = 0;
        if (y + this.height > MAP_HEIGHT) y = MAP_HEIGHT - this.height;

        // Check tile collisions
        const startCol = Math.floor(x / game.tileSize);
        const endCol = Math.floor((x + this.width - 1) / game.tileSize);
        const startRow = Math.floor(y / game.tileSize);
        const endRow = Math.floor((y + this.height - 1) / game.tileSize);

        const isTileWalkable = (r, c) => {
            if (r < 0 || r >= game.mapRows || c < 0 || c >= game.mapCols || !game.map[r] || typeof game.map[r][c] === 'undefined') return false;
            return game.map[r][c] === 0;
        };

        // Check if the new position overlaps with any unwalkable tiles
        let tileCollision = false;
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                if (!isTileWalkable(row, col)) {
                    tileCollision = true;
                    break;
                }
            }
            if (tileCollision) break;
        }

        if (tileCollision) {
            // If there's a collision, revert to the nearest valid position based on direction
            if (dx > 0) {
                // Moving right, find the nearest unwalkable tile's left edge
                for (let col = endCol; col >= startCol; col--) {
                    for (let row = startRow; row <= endRow; row++) {
                        if (!isTileWalkable(row, col)) {
                            x = col * game.tileSize - this.width;
                            break;
                        }
                    }
                }
            } else if (dx < 0) {
                // Moving left, find the nearest unwalkable tile's right edge
                for (let col = startCol; col <= endCol; col++) {
                    for (let row = startRow; row <= endRow; row++) {
                        if (!isTileWalkable(row, col)) {
                            x = (col + 1) * game.tileSize;
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
                            y = row * game.tileSize - this.height;
                            break;
                        }
                    }
                }
            } else if (dy < 0) {
                // Moving up, find the nearest unwalkable tile's bottom edge
                for (let row = startRow; row <= endRow; row++) {
                    for (let col = startCol; col <= endCol; col++) {
                        if (!isTileWalkable(row, col)) {
                            y = (row + 1) * game.tileSize;
                            break;
                        }
                    }
                }
            }
        }

        // Check ore deposit collisions
        for (let deposit of game.oreDeposits) {
            const npcLeft = x;
            const npcRight = x + this.width;
            const npcTop = y;
            const npcBottom = y + this.height;
            const depositLeft = deposit.x;
            const depositRight = deposit.x + deposit.width;
            const depositTop = deposit.y;
            const depositBottom = deposit.y + deposit.height;

            if (npcRight > depositLeft && npcLeft < depositRight && npcBottom > depositTop && npcTop < depositBottom) {
                if (dx > 0) x = depositLeft - this.width;
                else if (dx < 0) x = depositRight;
                if (dy > 0) y = depositTop - this.height;
                else if (dy < 0) y = depositBottom;
                break;
            }
        }

        // Check collisions with other NPCs (monsters and enemies)
        const allNPCs = [...game.monsters, ...game.enemies];
        for (let otherNPC of allNPCs) {
            if (otherNPC === this) continue; // Skip self
            const npcLeft = x;
            const npcRight = x + this.width;
            const npcTop = y;
            const npcBottom = y + this.height;
            const otherLeft = otherNPC.x;
            const otherRight = otherNPC.x + otherNPC.width;
            const otherTop = otherNPC.y;
            const otherBottom = otherNPC.y + otherNPC.height;

            if (npcRight > otherLeft && npcLeft < otherRight && npcBottom > otherTop && npcTop < otherBottom) {
                if (dx > 0) x = otherLeft - this.width;
                else if (dx < 0) x = otherRight;
                if (dy > 0) y = otherTop - this.height;
                else if (dy < 0) y = otherBottom;
                break;
            }
        }

        return { x, y };
    }

    move(game, deltaTime) {
        const speed = this.speed * (deltaTime / 1000); // Same speed calculation as player
        const { dx, dy } = this.getMovementInput(speed);

        let newX = this.x;
        let newY = this.y;

        console.log(`NPC ${this.type} attempting move: dx=${dx}, dy=${dy}, newX=${newX + dx}, newY=${newY + dy}`);

        if (dx !== 0) {
            newX += dx;
            const { x } = this.getValidPosition(game, newX, this.y, dx, dy);
            newX = x;
        }
        if (dy !== 0) {
            newY += dy;
            const { y } = this.getValidPosition(game, newX, newY, dx, dy);
            newY = y;
        }

        const tolerance = MOVEMENT_TOLERANCE;
        if (Math.abs(newX - this.x) < tolerance) newX = this.x;
        if (Math.abs(newY - this.y) < tolerance) newY = this.y;

        // If movement is blocked (position didn't change significantly), pick a new angle
        if (Math.abs(newX - this.x) < tolerance && Math.abs(newY - this.y) < tolerance && (dx !== 0 || dy !== 0)) {
            console.log(`NPC ${this.type} movement blocked, picking new angle`);
            this.angle = Math.random() * 2 * Math.PI; // Pick a new random angle
            return;
        }

        this.x = newX;
        this.y = newY;
        console.log(`NPC ${this.type} moved to x=${this.x}, y=${this.y}`);
    }

    wander(game, deltaTime) {
        this.currentTime += deltaTime / 1000; // Convert deltaTime to seconds

        if (this.state === 'moving') {
            console.log(`NPC ${this.type} moving, currentTime=${this.currentTime}, moveTime=${this.moveTime}`);
            this.move(game, deltaTime);
            if (this.currentTime >= this.moveTime) {
                console.log(`NPC ${this.type} finished moving, transitioning to paused`);
                this.state = 'paused';
                this.currentTime = 0;
                this.pauseTime = this.getRandomPauseTime();
            }
        } else if (this.state === 'paused') {
            console.log(`NPC ${this.type} paused, currentTime=${this.currentTime}, pauseTime=${this.pauseTime}`);
            if (this.currentTime >= this.pauseTime) {
                console.log(`NPC ${this.type} finished pausing, transitioning to moving`);
                this.state = 'moving';
                this.currentTime = 0;
                this.moveTime = this.getRandomMoveTime();
                this.angle = Math.random() * 2 * Math.PI; // Pick a new random angle
            }
        }
    }

    update(deltaTime, player, game) {
        // To be overridden by subclasses
    }

    // Getter methods for rendering positions
    getRenderX() {
        return this.x; // No interpolation, same as player
    }

    getRenderY() {
        return this.y; // No interpolation, same as player
    }

    draw(context) {
        context.fillStyle = this.color;
        context.fillRect(this.x, this.y, this.width, this.height);

        // Render full name
        context.fillStyle = 'white';
        context.font = '16px Arial';
        context.textAlign = 'center';
        context.fillText(this.type, this.x + this.width / 2, this.y + this.height / 2 + 8);
    }
}