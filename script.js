class OreDeposit {
    constructor(x, y, resource_type, ore_amount) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.resource_type = resource_type;
        this.ore_amount = ore_amount;
    }

    // Static method to spawn ore deposits
    static spawn(game, numDeposits) {
        const deposits = [];
        const resourceTypes = ['Mithril', 'Lavasteel', 'Obsidianite'];
        for (let i = 0; i < numDeposits; i++) {
            let x, y;
            let isValidPosition;
            do {
                x = Math.floor(Math.random() * game.mapCols) * game.tileSize;
                y = Math.floor(Math.random() * game.mapRows) * game.tileSize;
                // Check if the position is walkable and not overlapping with existing deposits in this spawn cycle
                isValidPosition = game.isWalkable(x, y, 50, 50) && !deposits.some(deposit => deposit.x === x && deposit.y === y);
            } while (!isValidPosition);

            // Random resource type and ore amount (between 50 and 200)
            const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
            const oreAmount = Math.floor(Math.random() * (200 - 50 + 1)) + 50;
            deposits.push(new OreDeposit(x, y, resourceType, oreAmount));
        }
        return deposits;
    }

    draw(context) {
        // Set color based on resource type
        let fillStyle;
        switch (this.resource_type) {
            case 'Mithril':
                fillStyle = '#FFFFE0'; // Light yellow
                break;
            case 'Lavasteel':
                fillStyle = '#FFA07A'; // Light orange
                break;
            case 'Obsidianite':
                fillStyle = '#4B0082'; // Dark purple (metallic sheen)
                break;
            default:
                fillStyle = '#FFD700'; // Default golden (fallback)
        }
        context.fillStyle = fillStyle;
        context.fillRect(this.x, this.y, this.width, this.height);
        // Debug: Draw hitbox outline
        // context.strokeStyle = 'red';
        // context.strokeRect(this.x, this.y, this.width, this.height);
    }
}

class Player {
    constructor(game) {
        this.game = game;
        this.width = 50; // Define player size
        this.height = 50;
        this.speed = 200; // Pixels per second;

        // Find a walkable starting position
        let startX, startY;
        do {
            startX = Math.floor(Math.random() * this.game.mapWidth / 50) * 50;
            startY = Math.floor(Math.random() * this.game.mapHeight / 50) * 50;
        } while (!this.game.isWalkable(startX, startY));
        this.x = startX;
        this.y = startY;
    }

    draw(context) {
        // Save context to apply camera translation
        context.save();
        // Translate to camera position
        context.translate(-this.game.camera.x, -this.game.camera.y);
        context.fillStyle = 'white';
        context.fillRect(this.x, this.y, this.width, this.height);
        context.restore();
    }

    update(deltaTime) {
        // Calculate movement based on speed and delta time
        const speed = this.speed * (deltaTime / 1000); // Convert to pixels per frame

        let newX = this.x;
        let newY = this.y;

        // Determine intended movement
        let dx = 0;
        let dy = 0;
        if (this.game.keys.includes('a')) dx -= speed;
        if (this.game.keys.includes('d')) dx += speed;
        if (this.game.keys.includes('w')) dy -= speed;
        if (this.game.keys.includes('s')) dy += speed;

        // Function to check if a position is valid and return nearest valid position if invalid
        const getValidPosition = (x, y) => {
            if (x < 0) x = 0;
            if (x + this.width > this.game.mapWidth) x = this.game.mapWidth - this.width;
            if (y < 0) y = 0;
            if (y + this.height > this.game.mapHeight) y = this.game.mapHeight - this.height;

            // Check if the entire hitbox is walkable
            if (this.game.isWalkable(x, y, this.width, this.height)) {
                return { x, y };
            }

            // Adjust position based on tile map (walls and water)
            const startCol = Math.floor(x / this.game.tileSize);
            const endCol = Math.floor((x + this.width - 1) / this.game.tileSize);
            const startRow = Math.floor(y / this.game.tileSize);
            const endRow = Math.floor((y + this.height - 1) / this.game.tileSize);

            const isTileWalkable = (r, c) => {
                if (r < 0 || r >= this.game.mapRows || c < 0 || c >= this.mapCols || !this.game.map[r] || typeof this.game.map[r][c] === 'undefined') {
                    return false;
                }
                return this.game.map[r][c] === 0;
            };

            // Adjust based on movement direction
            if (dx < 0) { // Moving left
                // Find the rightmost non-walkable tile in the hitbox
                for (let col = startCol; col <= endCol; col++) {
                    for (let row = startRow; row <= endRow; row++) {
                        if (!isTileWalkable(row, col)) {
                            const tileRight = (col + 1) * this.game.tileSize;
                            x = tileRight;
                            break;
                        }
                    }
                }
            } else if (dx > 0) { // Moving right
                // Find the leftmost non-walkable tile in the hitbox
                for (let col = endCol; col >= startCol; col--) {
                    for (let row = startRow; row <= endRow; row++) {
                        if (!isTileWalkable(row, col)) {
                            const tileLeft = col * this.game.tileSize;
                            x = tileLeft - this.width;
                            break;
                        }
                    }
                }
            }

            if (dy < 0) { // Moving up
                // Find the bottommost non-walkable tile in the hitbox
                for (let row = startRow; row <= endRow; row++) {
                    for (let col = startCol; col <= endCol; col++) {
                        if (!isTileWalkable(row, col)) {
                            const tileBottom = (row + 1) * this.game.tileSize;
                            y = tileBottom;
                            break;
                        }
                    }
                }
            } else if (dy > 0) { // Moving down
                // Find the topmost non-walkable tile in the hitbox
                for (let row = endRow; row >= startRow; row--) {
                    for (let col = startCol; col <= endCol; col++) {
                        if (!isTileWalkable(row, col)) {
                            const tileTop = row * this.game.tileSize;
                            y = tileTop - this.height;
                            break;
                        }
                    }
                }
            }

            // Adjust position to avoid collision with ore deposits
            for (let deposit of this.game.oreDeposits) {
                const playerLeft = x;
                const playerRight = x + this.width;
                const playerTop = y;
                const playerBottom = y + this.height;

                const depositLeft = deposit.x;
                const depositRight = deposit.x + deposit.width;
                const depositTop = deposit.y;
                const depositBottom = deposit.y + deposit.height;

                if (playerRight > depositLeft && playerLeft < depositRight &&
                    playerBottom > depositTop && playerTop < depositBottom) {
                    // Adjust position to the nearest edge of the deposit
                    if (dx > 0) x = depositLeft - this.width; // Move left of deposit
                    else if (dx < 0) x = depositRight; // Move right of deposit
                    if (dy > 0) y = depositTop - this.height; // Move above deposit
                    else if (dy < 0) y = depositBottom; // Move below deposit
                    break;
                }
            }

            return { x, y };
        };

        // Try moving along x-axis
        if (dx !== 0) {
            newX += dx;
            const { x } = getValidPosition(newX, this.y);
            newX = x;
        }

        // Try moving along y-axis with updated x
        if (dy !== 0) {
            newY += dy;
            const { y } = getValidPosition(newX, newY);
            newY = y;
        }

        // Apply the new position with a small tolerance to prevent oscillation
        const tolerance = 0.1;
        if (Math.abs(newX - this.x) < tolerance) newX = this.x;
        if (Math.abs(newY - this.y) < tolerance) newY = this.y;
        this.x = newX;
        this.y = newY;

        // Update camera to follow player
        this.game.camera.update();
    }
}

class Camera {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
    }

    update() {
        // Center the camera on the player
        const player = this.game.player;
        this.x = player.x - this.game.canvas.width / 2 + player.width / 2;
        this.y = player.y - this.game.canvas.height / 2 + player.height / 2;

        // Clamp camera to map boundaries
        const mapWidth = this.game.mapWidth;
        const mapHeight = this.game.mapHeight;
        this.x = Math.max(0, Math.min(this.x, mapWidth - this.game.canvas.width));
        this.y = Math.max(0, Math.min(this.y, mapHeight - this.game.canvas.height));
    }
}

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.mapWidth = 2000; // Large map size
        this.mapHeight = 2000;
        this.tileSize = 50; // 50x50 tiles
        this.mapCols = this.mapWidth / this.tileSize; // 40 columns
        this.mapRows = this.mapHeight / this.tileSize; // 40 rows
        this.keys = [];
        this.map = []; // 2D array to store the tile map
        this.oreDeposits = []; // Initialize as an empty array to avoid undefined

        // Generate the map first
        this.generateMap();

        // Spawn ore deposits
        this.oreDeposits = OreDeposit.spawn(this, 10);

        // Now create the player, after the map and ore deposits are generated
        this.player = new Player(this);

        // Create the camera
        this.camera = new Camera(this);

        // Keyboard event listeners
        window.addEventListener('keydown', (e) => {
            if (!this.keys.includes(e.key)) this.keys.push(e.key);
        });
        window.addEventListener('keyup', (e) => {
            const index = this.keys.indexOf(e.key);
            if (index > -1) this.keys.splice(index, 1);
        });
    }

    generateMap() {
        // Initialize map with all walkable tiles (0 = walkable, 1 = wall, 2 = water)
        for (let row = 0; row < this.mapRows; row++) {
            this.map[row] = [];
            for (let col = 0; col < this.mapCols; col++) {
                this.map[row][col] = 0; // Walkable (light grey)
            }
        }

        // Generate walls using random walk (dark grey)
        const numWallWalks = 5; // Number of wall clusters
        for (let i = 0; i < numWallWalks; i++) {
            let x = Math.floor(Math.random() * this.mapCols);
            let y = Math.floor(Math.random() * this.mapRows);
            const walkLength = 20; // Length of each walk
            for (let j = 0; j < walkLength; j++) {
                this.map[y][x] = 1; // Set tile to wall
                // Randomly move to an adjacent tile
                const direction = Math.floor(Math.random() * 4);
                if (direction === 0 && x > 0) x--; // Left
                if (direction === 1 && x < this.mapCols - 1) x++; // Right
                if (direction === 2 && y > 0) y--; // Up
                if (direction === 3 && y < this.mapRows - 1) y++; // Down
            }
        }

        // Generate water using random walk (blue)
        const numWaterWalks = 3; // Number of water clusters
        for (let i = 0; i < numWaterWalks; i++) {
            let x = Math.floor(Math.random() * this.mapCols);
            let y = Math.floor(Math.random() * this.mapRows);
            const walkLength = 15; // Length of each walk
            for (let j = 0; j < walkLength; j++) {
                this.map[y][x] = 2; // Set tile to water
                // Randomly move to an adjacent tile
                const direction = Math.floor(Math.random() * 4);
                if (direction === 0 && x > 0) x--; // Left
                if (direction === 1 && x < this.mapCols - 1) x++; // Right
                if (direction === 2 && y > 0) y--; // Up
                if (direction === 3 && y < this.mapRows - 1) y++; // Down
            }
        }
    }

    isWalkable(x, y, width = 50, height = 50) {
        // Calculate the range of tiles the hitbox covers
        const startCol = Math.floor(x / this.tileSize);
        const endCol = Math.floor((x + width - 1) / this.tileSize);
        const startRow = Math.floor(y / this.tileSize);
        const endRow = Math.floor((y + height - 1) / this.tileSize);

        // Check all tiles in the range
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                // Check tile map
                if (row < 0 || row >= this.mapRows || col < 0 || col >= this.mapCols || !this.map[row] || typeof this.map[row][col] === 'undefined') {
                    return false;
                }
                if (this.map[row][col] !== 0) return false; // Not walkable if tile is wall (1) or water (2)
            }
        }

        // Check for collision with ore deposits
        if (this.oreDeposits) {
            for (let deposit of this.oreDeposits) {
                // Axis-Aligned Bounding Box (AABB) collision detection
                const playerLeft = x;
                const playerRight = x + width;
                const playerTop = y;
                const playerBottom = y + height;

                const depositLeft = deposit.x;
                const depositRight = deposit.x + deposit.width;
                const depositTop = deposit.y;
                const depositBottom = deposit.y + deposit.height;

                // Check if player's bounding box overlaps with deposit's bounding box
                if (playerRight > depositLeft && playerLeft < depositRight &&
                    playerBottom > depositTop && playerTop < depositBottom) {
                    return false;
                }
            }
        }
        return true;
    }

    render(context, deltaTime) {
        // Clear canvas
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Determine visible tile range
        const startCol = Math.floor(this.camera.x / this.tileSize);
        const endCol = Math.min(startCol + Math.ceil(this.canvas.width / this.tileSize) + 1, this.mapCols);
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endRow = Math.min(startRow + Math.ceil(this.canvas.height / this.tileSize) + 1, this.mapRows);

        // Draw tiles
        context.save();
        context.translate(-this.camera.x, -this.camera.y);
        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                const tile = this.map[row][col];
                const x = col * this.tileSize;
                const y = row * this.tileSize;

                // Set color based on tile type
                if (tile === 0) context.fillStyle = '#D3D3D3'; // Walkable (light grey)
                else if (tile === 1) context.fillStyle = '#555555'; // Wall (dark grey)
                else if (tile === 2) context.fillStyle = '#0000FF'; // Water (blue)

                context.fillRect(x, y, this.tileSize, this.tileSize);
            }
        }

        // Draw ore deposits
        if (this.oreDeposits) {
            for (let deposit of this.oreDeposits) {
                deposit.draw(context);
            }
        }

        context.restore();

        // Update and draw player
        this.player.update(deltaTime);
        this.player.draw(context);
    }
}

window.addEventListener('load', function () {
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 800;
    ctx.font = '20px Impact';

    const game = new Game(canvas);
    let lastTime = 0;

    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime; // Time since last frame in ms
        lastTime = timeStamp;
        game.render(ctx, deltaTime);
        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
});