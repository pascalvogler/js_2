export class Player {
    constructor(game) {
        this.game = game;
        this.width = 50;
        this.height = 50;
        this.speed = 200;
        this.totalEnergy = 0;

        let startX, startY;
        do {
            startX = Math.floor(Math.random() * this.game.mapWidth / 50) * 50;
            startY = Math.floor(Math.random() * this.game.mapHeight / 50) * 50;
        } while (!this.game.isWalkable(startX, startY));
        this.x = startX;
        this.y = startY;
    }

    draw(context) {
        context.save();
        context.translate(-this.game.camera.x, -this.game.camera.y);
        context.fillStyle = 'white';
        context.fillRect(this.x, this.y, this.width, this.height);

        if (this.game.mining.active && this.game.mining.ore) {
            const barWidth = this.width;
            const barHeight = 10;
            const barX = this.x;
            const barY = this.y + this.height + 2;
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

        const tolerance = 0.1;
        if (Math.abs(newX - this.x) < tolerance) newX = this.x;
        if (Math.abs(newY - this.y) < tolerance) newY = this.y;

        this.x = newX;
        this.y = newY;
    }

    getValidPosition(x, y, dx, dy) {
        if (x < 0) x = 0;
        if (x + this.width > this.game.mapWidth) x = this.game.mapWidth - this.width;
        if (y < 0) y = 0;
        if (y + this.height > this.game.mapHeight) y = this.game.mapHeight - this.height;

        if (this.game.isWalkable(x, y, this.width, this.height)) return { x, y };

        const startCol = Math.floor(x / this.game.tileSize);
        const endCol = Math.floor((x + this.width - 1) / this.game.tileSize);
        const startRow = Math.floor(y / this.game.tileSize);
        const endRow = Math.floor((y + this.height - 1) / this.game.tileSize);

        const isTileWalkable = (r, c) => {
            if (r < 0 || r >= this.game.mapRows || c < 0 || c >= this.mapCols || !this.game.map[r] || typeof this.game.map[r][c] === 'undefined') return false;
            return this.game.map[r][c] === 0;
        };

        if (dx < 0) for (let col = startCol; col <= endCol; col++) for (let row = startRow; row <= endRow; row++) if (!isTileWalkable(row, col)) { x = (col + 1) * this.game.tileSize; break; }
        else if (dx > 0) for (let col = endCol; col >= startCol; col--) for (let row = startRow; row <= endRow; row++) if (!isTileWalkable(row, col)) { x = col * this.game.tileSize - this.width; break; }

        if (dy < 0) for (let row = startRow; row <= endRow; row++) for (let col = startCol; col <= endCol; col++) if (!isTileWalkable(row, col)) { y = (row + 1) * this.game.tileSize; break; }
        else if (dy > 0) for (let row = endRow; row >= startRow; row--) for (let col = startCol; col <= endCol; col++) if (!isTileWalkable(row, col)) { y = row * this.game.tileSize - this.height; break; }

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
}