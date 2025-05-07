import { Tooltip } from './Tooltip.js';
import { OreDeposit } from './OreDeposit.js';
import { Player } from './Player.js';
import { Camera } from './Camera.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.mapWidth = 2000;
        this.mapHeight = 2000;
        this.tileSize = 50;
        this.mapCols = this.mapWidth / this.tileSize;
        this.mapRows = this.mapHeight / this.tileSize;
        this.keys = [];
        this.map = [];
        this.oreDeposits = [];
        this.mouse = { x: 0, y: 0 };
        this.mining = { active: false, ore: null, startTime: 0 };
        this.miningFeedback = [];
        this.tooltip = new Tooltip(this, null);
        this.state = 'running'; // State management: 'running' or 'paused'

        // Expose classes for use in other modules
        this.OreDeposit = OreDeposit;
        this.Player = Player;
        this.Camera = Camera;

        this.generateMap();
        this.oreDeposits = OreDeposit.spawn(this, 10);
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
                this.state = this.state === 'running' ? 'paused' : 'running';
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

                let hoveredDeposit = null;
                for (let deposit of this.oreDeposits) {
                    if (this.mouse.x >= deposit.x && this.mouse.x <= deposit.x + deposit.width &&
                        this.mouse.y >= deposit.y && this.mouse.y <= deposit.y + deposit.height) {
                        hoveredDeposit = deposit;
                        break;
                    }
                }
                this.tooltip.target = hoveredDeposit;
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (this.state === 'running' && e.button === 0) {
                if (this.mining.active) return;

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

                        if (distance <= 75) {
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

        const numWallWalks = 5;
        for (let i = 0; i < numWallWalks; i++) {
            let x = Math.floor(Math.random() * this.mapCols);
            let y = Math.floor(Math.random() * this.mapRows);
            const walkLength = 20;
            for (let j = 0; j < walkLength; j++) {
                this.map[y][x] = 1;
                const direction = Math.floor(Math.random() * 4);
                if (direction === 0 && x > 0) x--;
                if (direction === 1 && x < this.mapCols - 1) x++;
                if (direction === 2 && y > 0) y--;
                if (direction === 3 && y < this.mapRows - 1) y++;
            }
        }

        const numWaterWalks = 3;
        for (let i = 0; i < numWaterWalks; i++) {
            let x = Math.floor(Math.random() * this.mapCols);
            let y = Math.floor(Math.random() * this.mapRows);
            const walkLength = 15;
            for (let j = 0; j < walkLength; j++) {
                this.map[y][x] = 2;
                const direction = Math.floor(Math.random() * 4);
                if (direction === 0 && x > 0) x--;
                if (direction === 1 && x < this.mapCols - 1) x++;
                if (direction === 2 && y > 0) y--;
                if (direction === 3 && y < this.mapRows - 1) y++;
            }
        }
    }

    isWalkable(x, y, width = 50, height = 50) {
        const startCol = Math.floor(x / this.tileSize);
        const endCol = Math.floor((x + width - 1) / this.tileSize);
        const startRow = Math.floor(y / this.tileSize);
        const endRow = Math.floor((y + height - 1) / this.tileSize);

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                if (row < 0 || row >= this.mapRows || col < 0 || col >= this.mapCols || !this.map[row] || typeof this.map[row][col] === 'undefined') return false;
                if (this.map[row][col] !== 0) return false;
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

                if (playerRight > depositLeft && playerLeft < depositRight && playerBottom > depositTop && playerTop < depositBottom) return false;
            }
        }
        return true;
    }

    render(context, deltaTime) {
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
        const padding = 10;
        const windowWidth = context.measureText(energyText).width + padding * 2;
        const windowHeight = 30;
        const windowX = this.width - windowWidth;
        const windowY = this.height - windowHeight;
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(windowX, windowY, windowWidth, windowHeight);
        context.fillStyle = 'white';
        context.fillText(energyText, windowX + padding, windowY + 20);

        // Pause indication
        if (this.state === 'paused') {
            context.fillStyle = 'rgba(0, 0, 0, 0.5)';
            context.fillRect(0, 0, this.width, this.height);
            context.fillStyle = 'white';
            context.font = 'bold 48px Impact';
            context.textAlign = 'center';
            context.fillText('Paused', this.width / 2, this.height / 2);
            context.textAlign = 'left';
        }
    }
}

// Game loop setup
window.addEventListener('load', function () {
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d');
    canvas.width = 1800;
    canvas.height = 800;
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