class Player {
    constructor(game) {
        this.game = game;
        this.width = 50; // Define player size
        this.height = 50;
        this.speed = 200; // Pixels per second

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

        // Function to check if a position is valid
        const isValidPosition = (x, y) => {
            return x >= 0 && x + this.width <= this.game.mapWidth && y >= 0 && y + this.height <= this.game.mapHeight &&
                   this.game.isWalkable(x, y) && this.game.isWalkable(x + this.width - 1, y) &&
                   this.game.isWalkable(x, y + this.height - 1) && this.game.isWalkable(x + this.width - 1, y + this.height - 1);
        };

        // Try moving along x-axis
        if (dx !== 0) {
            newX += dx;
            const tileX = Math.floor(newX / this.game.tileSize) * this.game.tileSize;
            if (!isValidPosition(newX, this.y)) {
                // Clamp to the nearest tile edge
                newX = dx > 0 ? tileX : tileX + this.game.tileSize;
            }
        }

        // Try moving along y-axis with updated x
        if (dy !== 0) {
            newY += dy;
            const tileY = Math.floor(newY / this.game.tileSize) * this.game.tileSize;
            if (!isValidPosition(newX, newY)) {
                // Clamp to the nearest tile edge
                newY = dy > 0 ? tileY : tileY + this.game.tileSize;
            }
        }

        // Apply the new position with a small tolerance to prevent oscillation
        const tolerance = 0.1;
        if (Math.abs(newX - this.x) < tolerance) newX = this.x;
        if (Math.abs(newY - this.y) < tolerance) newY = this.y;
        this.x = newX;
        this.y = newY;

        // Update camera to follow player
        this.game.camera.update();
        console.log("player x: " + this.x + " - y: " + this.y);
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

        // Generate the map first
        this.generateMap();

        // Now create the player, after the map is generated
        this.player = new Player(this);
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

    isWalkable(x, y) {
        // Convert pixel coordinates to tile coordinates
        const col = Math.floor(x / this.tileSize);
        const row = Math.floor(y / this.tileSize);
        // Check if within bounds and walkable
        if (row >= 0 && row < this.mapRows && col >= 0 && col < this.mapCols && this.map[row] && typeof this.map[row][col] !== 'undefined') {
            return this.map[row][col] === 0; // Walkable if tile is 0
        }
        return false;
    }

    render(context, deltaTime) {
        // Clear canvas
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Determine visible tile range
        const startCol = Math.floor(this.camera.x / this.tileSize);
        const endCol = Math.min(startCol + Math.ceil(this.canvas.width / this.tileSize) + 1, this.mapCols);
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endRow = Math.min(startRow + Math.ceil(this.height / this.tileSize) + 1, this.mapRows);

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