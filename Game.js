import { Tooltip } from './Tooltip.js';
import { OreDeposit } from './OreDeposit.js';
import { Player } from './Player.js';
import { Camera } from './Camera.js';
import { Monster } from './Monster.js';
import { Enemy } from './Enemy.js';
import {
    CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT,
    NUM_WALL_WALKS, NUM_WATER_WALKS, WALL_WALK_LENGTH, WATER_WALK_LENGTH,
    MINING_RANGE, NUM_ORE_DEPOSITS, NUM_MONSTERS, NUM_ENEMIES, ENERGY_WINDOW_HEIGHT, ENERGY_WINDOW_PADDING, PAUSE_TEXT_SIZE
} from './Constants.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.mapWidth = MAP_WIDTH;
        this.mapHeight = MAP_HEIGHT;
        this.tileSize = TILE_SIZE;
        this.mapCols = this.mapWidth / this.tileSize;
        this.mapRows = this.mapHeight / this.tileSize;
        this.keys = [];
        this.map = [];
        this.oreDeposits = [];
        this.monsters = [];
        this.enemies = [];
        this.mouse = { x: 0, y: 0 };
        this.mining = { active: false, ore: null, startTime: 0 };
        this.miningFeedback = [];
        this.tooltip = new Tooltip(this, null);
        this.state = 'running'; // State management: 'running', 'paused', or 'gameOver'

        // Expose classes for use in other modules
        this.OreDeposit = OreDeposit;
        this.Player = Player;
        this.Camera = Camera;
        this.Monster = Monster;
        this.Enemy = Enemy;

        this.generateMap();
        this.oreDeposits = OreDeposit.spawn(this, NUM_ORE_DEPOSITS);
        this.monsters = Monster.spawn(this);
        this.enemies = Enemy.spawn(this);
        this.player = new Player(this);
        this.camera = new Camera(this);

        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (this.state === 'running') {
                if (!this.keys.includes(key)) this.keys.push(key);
                if (['w', 'a', 's', 'd', 'shift'].includes(key)) e.preventDefault();
            }
            // Handle pause/unpause with ESC (keyCode 27)
            if (e.keyCode === 27) {
                if (this.state === 'running') {
                    this.state = 'paused';
                    this.keys = []; // Clear keys to stop movement
                } else if (this.state === 'paused') {
                    this.state = 'running';
                }
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.state === 'running') {
                const key = e.key.toLowerCase();
                const index = this.keys.indexOf(key);
                if (index > -1) this.keys.splice(index, 1);
                if (['w', 'a', 's', 'd', 'shift'].includes(key)) e.preventDefault();
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.state === 'running') {
                const rect = this.canvas.getBoundingClientRect();
                this.mouse.x = e.clientX - rect.left + this.camera.x;
                this.mouse.y = e.clientY - rect.top + this.camera.y;

                let hoveredTarget = null;
                for (let deposit of this.oreDeposits) {
                    if (this.mouse.x >= deposit.x && this.mouse.x <= deposit.x + deposit.width &&
                        this.mouse.y >= deposit.y && this.mouse.y <= deposit.y + deposit.height) {
                        hoveredTarget = deposit;
                        break;
                    }
                }
                for (let monster of this.monsters) {
                    if (this.mouse.x >= monster.x && this.mouse.x <= monster.x + monster.width &&
                        this.mouse.y >= monster.y && this.mouse.y <= monster.y + monster.height) {
                        hoveredTarget = monster;
                        break;
                    }
                }
                for (let enemy of this.enemies) {
                    if (this.mouse.x >= enemy.x && this.mouse.x <= enemy.x + enemy.width &&
                        this.mouse.y >= enemy.y && this.mouse.y <= enemy.y + enemy.height) {
                        hoveredTarget = enemy;
                        break;
                    }
                }
                this.tooltip.target = hoveredTarget;
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (this.state === 'running' && e.button === 0) {
                if (this.mining.active) return;

                // Check for mining
                for (let deposit of this.oreDeposits) {
                    if (this.mouse.x >= deposit.x && this.mouse.x <= deposit.x + deposit.width &&
                        this.mouse.y >= deposit.y && this.mouse.y <= deposit.y + deposit.height) {
                        const playerCenterX = this.player.x + this.player.width / 2;
                        const playerCenterY = this.player.y + this.player.height / 2;
                        const oreCenterX = deposit.x + deposit.width / 2;
                        const oreCenterY = deposit.y + deposit.height / 2;
                        const dx = playerCenterX - oreCenterX;
                        const dy = playerCenterY - oreCenterY;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance <= MINING_RANGE) {
                            this.mining.active = true;
                            this.mining.ore = deposit;
                            this.mining.startTime = Date.now();
                            break;
                        }
                    }
                }
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (this.state === 'running' && e.button === 0) {
                this.mining.active = false;
                this.mining.ore = null;
                this.mining.startTime = 0;
            }
        });
    }

    generateMap() {
        for (let row = 0; row < this.mapRows; row++) {
            this.map[row] = [];
            for (let col = 0; col < this.mapCols; col++) {
                this.map[row][col] = 0;
            }
        }

        for (let i = 0; i < NUM_WALL_WALKS; i++) {
            let x = Math.floor(Math.random() * this.mapCols);
            let y = Math.floor(Math.random() * this.mapRows);
            for (let j = 0; j < WALL_WALK_LENGTH; j++) {
                this.map[y][x] = 1;
                const direction = Math.floor(Math.random() * 4);
                if (direction === 0 && x > 0) x--;
                if (direction === 1 && x < this.mapCols - 1) x++;
                if (direction === 2 && y > 0) y--;
                if (direction === 3 && y < this.mapRows - 1) y++;
            }
        }

        for (let i = 0; i < NUM_WATER_WALKS; i++) {
            let x = Math.floor(Math.random() * this.mapCols);
            let y = Math.floor(Math.random() * this.mapRows);
            for (let j = 0; j < WATER_WALK_LENGTH; j++) {
                this.map[y][x] = 2;
                const direction = Math.floor(Math.random() * 4);
                if (direction === 0 && x > 0) x--;
                if (direction === 1 && x < this.mapCols - 1) x++;
                if (direction === 2 && y > 0) y--;
                if (direction === 3 && y < this.mapRows - 1) y++;
            }
        }
    }

    isWalkable(x, y, width = TILE_SIZE, height = TILE_SIZE) {
        const startCol = Math.floor(x / this.tileSize);
        const endCol = Math.floor((x + width - 1) / this.tileSize);
        const startRow = Math.floor(y / this.tileSize);
        const endRow = Math.floor((y + height - 1) / this.tileSize);

        console.log(`Checking isWalkable for x=${x}, y=${y}, width=${width}, height=${height}`);

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                if (row < 0 || row >= this.mapRows || col < 0 || col >= this.mapCols || !this.map[row] || typeof this.map[row][col] === 'undefined') {
                    console.log(`isWalkable failed: Out of bounds or undefined at row=${row}, col=${col}`);
                    return false;
                }
                if (this.map[row][col] !== 0) {
                    console.log(`isWalkable failed: Non-walkable tile at row=${row}, col=${col}, value=${this.map[row][col]}`);
                    return false;
                }
            }
        }

        if (this.oreDeposits) {
            for (let deposit of this.oreDeposits) {
                const playerLeft = x;
                const playerRight = x + width;
                const playerTop = y;
                const playerBottom = y + height;
                const depositLeft = deposit.x;
                const depositRight = deposit.x + deposit.width;
                const depositTop = deposit.y;
                const depositBottom = deposit.y + deposit.height;

                if (playerRight > depositLeft && playerLeft < depositRight && playerBottom > depositTop && playerTop < depositBottom) {
                    console.log(`isWalkable failed: Collision with ore at x=${deposit.x}, y=${deposit.y}`);
                    return false;
                }
            }
        }

        if (this.monsters) {
            for (let monster of this.monsters) {
                const playerLeft = x;
                const playerRight = x + width;
                const playerTop = y;
                const playerBottom = y + height;
                const monsterLeft = monster.x;
                const monsterRight = monster.x + monster.width;
                const monsterTop = monster.y;
                const monsterBottom = monster.y + monster.height;

                if (playerRight > monsterLeft && playerLeft < monsterRight && playerBottom > monsterTop && playerTop < monsterBottom) {
                    console.log(`isWalkable failed: Collision with monster at x=${monster.x}, y=${monster.y}`);
                    return false;
                }
            }
        }

        if (this.enemies) {
            for (let enemy of this.enemies) {
                const playerLeft = x;
                const playerRight = x + width;
                const playerTop = y;
                const playerBottom = y + height;
                const enemyLeft = enemy.x;
                const enemyRight = enemy.x + enemy.width;
                const enemyTop = enemy.y;
                const enemyBottom = enemy.y + enemy.height;

                if (playerRight > enemyLeft && playerLeft < enemyRight && playerBottom > enemyTop && playerTop < enemyBottom) {
                    console.log(`isWalkable failed: Collision with enemy at x=${enemy.x}, y=${enemy.y}`);
                    return false;
                }
            }
        }
        console.log(`isWalkable succeeded for x=${x}, y=${y}`);
        return true;
    }

    render(context, deltaTime) {
        console.log(`Render called, player.isGameStarted: ${this.player.isGameStarted}`);

        // Start the game before any updates to prevent premature attacks
        if (!this.player.isGameStarted) {
            this.player.startGame();
            console.log(`Game started, player.isGameStarted now: ${this.player.isGameStarted}`);
        }

        context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const startCol = Math.floor(this.camera.x / this.tileSize);
        const endCol = Math.min(startCol + Math.ceil(this.canvas.width / this.tileSize) + 1, this.mapCols);
        const startRow = Math.floor(this.camera.y / this.tileSize);
        const endRow = Math.min(startRow + Math.ceil(this.canvas.height / this.tileSize) + 1, this.mapRows);

        context.save();
        context.translate(-this.camera.x, -this.camera.y);
        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                const tile = this.map[row][col];
                const x = col * this.tileSize;
                const y = row * this.tileSize;
                if (tile === 0) context.fillStyle = '#D3D3D3';
                else if (tile === 1) context.fillStyle = '#555555';
                else if (tile === 2) context.fillStyle = '#0000FF';
                context.fillRect(x, y, this.tileSize, this.tileSize);
            }
        }

        if (this.oreDeposits) {
            for (let deposit of this.oreDeposits) deposit.draw(context);
        }
        if (this.monsters) {
            for (let monster of this.monsters) {
                if (this.state === 'running') {
                    monster.update(deltaTime, this.player, this); // Only update when running
                }
                monster.draw(context);
            }
        }
        if (this.enemies) {
            for (let enemy of this.enemies) {
                if (this.state === 'running') {
                    enemy.update(deltaTime, this.player, this); // Only update when running
                }
                enemy.draw(context);
            }
        }

        context.restore();

        if (this.state === 'running') {
            this.player.update(deltaTime);
            this.player.draw(context);
            this.tooltip.update(this.keys.includes('shift'));
        } else {
            this.player.draw(context); // Draw player but don't update
        }
        this.tooltip.draw(context); // Draw tooltip but don't update when paused

        if (this.state === 'running' && this.mining.active && this.mining.ore) {
            const ore = this.mining.ore;
            const isMouseOverOre = this.mouse.x >= ore.x && this.mouse.x <= ore.x + ore.width &&
                                  this.mouse.y >= ore.y && this.mouse.y <= ore.y + ore.height;
            if (!isMouseOverOre) {
                this.mining.active = false;
                this.mining.ore = null;
                this.mining.startTime = 0;
            } else {
                const currentTime = Date.now();
                const holdTime = (currentTime - this.mining.startTime) / 1000;
                if (holdTime >= 1 && this.mining.ore.energy > 0) {
                    this.mining.ore.energy -= 1;
                    this.player.totalEnergy += 1;
                    this.mining.startTime = currentTime;

                    this.miningFeedback.push({
                        x: this.mining.ore.x + this.mining.ore.width / 2,
                        y: this.mining.ore.y - 10,
                        text: '+1',
                        startTime: currentTime,
                        duration: 0.5
                    });

                    if (this.mining.ore.energy <= 0) {
                        const col = Math.floor(this.mining.ore.x / this.tileSize);
                        const row = Math.floor(this.mining.ore.y / this.tileSize);
                        this.map[row][col] = 0;
                        this.oreDeposits = this.oreDeposits.filter(d => d !== this.mining.ore);
                        this.mining.active = false;
                        this.mining.ore = null;
                        this.mining.startTime = 0;
                    }
                }
            }
        }

        context.save();
        context.translate(-this.camera.x, -this.camera.y);
        if (this.state === 'running') {
            context.fillStyle = 'green';
            this.miningFeedback = this.miningFeedback.filter(feedback => {
                const elapsed = (Date.now() - feedback.startTime) / 1000;
                if (elapsed < feedback.duration) {
                    context.fillText(feedback.text, feedback.x, feedback.y);
                    return true;
                }
                return false;
            });
        }
        context.restore();

        context.font = '20px Impact';
        const energyText = `Total Energy: ${this.player.totalEnergy}`;
        const windowWidth = context.measureText(energyText).width + ENERGY_WINDOW_PADDING * 2;
        const windowX = this.width - windowWidth;
        const windowY = this.height - ENERGY_WINDOW_HEIGHT;
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(windowX, windowY, windowWidth, ENERGY_WINDOW_HEIGHT);
        context.fillStyle = 'white';
        context.fillText(energyText, windowX + ENERGY_WINDOW_PADDING, windowY + 20);

        // Pause indication
        if (this.state === 'paused') {
            context.fillStyle = 'rgba(0, 0, 0, 0.5)';
            context.fillRect(0, 0, this.width, this.height);
            context.fillStyle = 'white';
            context.font = `bold ${PAUSE_TEXT_SIZE}px Impact`;
            context.textAlign = 'center';
            context.fillText('Paused', this.width / 2, this.height / 2);
            context.textAlign = 'left';
        }

        // Game Over indication
        if (this.state === 'gameOver') {
            context.fillStyle = 'rgba(0, 0, 0, 0.8)';
            context.fillRect(0, 0, this.width, this.height);
            context.fillStyle = 'red';
            context.font = `bold ${PAUSE_TEXT_SIZE}px Impact`;
            context.textAlign = 'center';
            context.fillText('Game Over', this.width / 2, this.height / 2);
            context.textAlign = 'left';
        }
    }
}

// Game loop setup
window.addEventListener('load', function () {
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx.font = '20px Impact';

    const game = new Game(canvas);
    let lastTime = 0;

    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;
        game.render(ctx, deltaTime);
        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
});