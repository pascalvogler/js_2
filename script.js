class Tooltip {
    constructor(game, target) {
        this.game = game;
        this.target = target;
        this.visible = false;
        this.isExpanded = false;

        // Default positioning (bottom right, above energy status)
        this.x = this.game.width - 200;
        this.y = this.game.height - 40;
        this.padding = 10;
        this.gapBetweenSections = 15;
        this.defaultFont = '16px Impact';
        this.expandedFont = '14px Impact';
        this.defaultHeight = 16;
        this.lineHeight = 16;
    }

    update(shiftHeld) {
        this.visible = !!this.target;
        this.isExpanded = this.visible && shiftHeld;

        // Calculate content
        this.game.context.font = this.defaultFont;
        this.defaultText = `${this.target.resource_type} (Shift)`;
        this.defaultWidth = this.game.context.measureText(this.defaultText).width + this.padding * 2;

        if (this.isExpanded) {
            const { energyMin, energyMax } = OreDeposit.oreData[this.target.resource_type];
            this.expandedLines = [
                `Contains ${energyMin}-${energyMax} Energy`,
                `Hold left mouse button to mine`
            ];
            this.game.context.font = this.expandedFont;
            this.expandedWidth = this.defaultWidth;
            for (let line of this.expandedLines) {
                const lineWidth = this.game.context.measureText(line).width + this.padding * 2;
                this.expandedWidth = Math.max(this.expandedWidth, lineWidth);
            }
            this.expandedHeight = this.expandedLines.length * this.lineHeight;
        } else {
            this.expandedWidth = this.defaultWidth;
            this.expandedHeight = 0;
        }

        // Position adjustment to stay above energy status with dynamic upward shift
        const totalHeight = this.defaultHeight + (this.isExpanded ? this.gapBetweenSections : 0) + this.expandedHeight + this.padding;
        const energyY = this.game.height - 30;
        this.y = energyY - totalHeight - this.padding;
        this.x = this.game.width - Math.max(this.expandedWidth, this.defaultWidth);
    }

    draw(context) {
        if (!this.visible) return;

        // Draw background
        const totalHeight = this.defaultHeight + (this.isExpanded ? this.gapBetweenSections : 0) + this.expandedHeight + this.padding;
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(this.x, this.y, this.expandedWidth, totalHeight);

        // Draw default text
        context.font = this.defaultFont;
        context.fillStyle = 'white';
        context.fillText(this.defaultText, this.x + this.padding, this.y + this.defaultHeight);

        // Draw expanded text if applicable
        if (this.isExpanded) {
            context.font = this.expandedFont;
            for (let i = 0; i < this.expandedLines.length; i++) {
                const lineY = this.y + this.defaultHeight + this.gapBetweenSections + (i * this.lineHeight);
                context.fillText(this.expandedLines[i], this.x + this.padding, lineY);
            }
        }
    }
}

class OreDeposit {
    constructor(x, y, resource_type, energy) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.resource_type = resource_type;
        this.energy = energy;
    }

    static oreData = {
        'Lavasteel': { probability: 70, energyMin: 1, energyMax: 3 },
        'Mithril': { probability: 25, energyMin: 2, energyMax: 6 },
        'Obsidianite': { probability: 5, energyMin: 8, energyMax: 12 }
    };

    static spawn(game, numDeposits) {
        const deposits = [];
        const resourceTypes = Object.keys(OreDeposit.oreData);
        const cumulativeProbabilities = [];
        let cumulative = 0;
        for (let type of resourceTypes) {
            cumulative += OreDeposit.oreData[type].probability;
            cumulativeProbabilities.push({ type, threshold: cumulative });
        }

        for (let i = 0; i < numDeposits; i++) {
            let x, y;
            let isValidPosition;
            do {
                x = Math.floor(Math.random() * game.mapCols) * game.tileSize;
                y = Math.floor(Math.random() * game.mapRows) * game.tileSize;
                isValidPosition = game.isWalkable(x, y, 50, 50) && !deposits.some(deposit => deposit.x === x && deposit.y === y);
            } while (!isValidPosition);

            const rand = Math.random() * 100;
            let resourceType = resourceTypes[0];
            for (let { type, threshold } of cumulativeProbabilities) {
                if (rand <= threshold) {
                    resourceType = type;
                    break;
                }
            }

            const { energyMin, energyMax } = OreDeposit.oreData[resourceType];
            const energy = Math.floor(Math.random() * (energyMax - energyMin + 1)) + energyMin;

            deposits.push(new OreDeposit(x, y, resourceType, energy));
        }
        return deposits;
    }

    draw(context) {
        let fillStyle;
        switch (this.resource_type) {
            case 'Mithril': fillStyle = '#FFFFE0'; break;
            case 'Lavasteel': fillStyle = '#FFA07A'; break;
            case 'Obsidianite': fillStyle = '#4B0082'; break;
            default: fillStyle = '#FFD700';
        }
        context.fillStyle = fillStyle;
        context.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Player {
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
        const speed = this.speed * (deltaTime / 1000);
        let newX = this.x;
        let newY = this.y;

        if (this.game.mining.active) return;

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

        const getValidPosition = (x, y) => {
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
        };

        if (dx !== 0) {
            newX += dx;
            const { x } = getValidPosition(newX, this.y);
            newX = x;
        }
        if (dy !== 0) {
            newY += dy;
            const { y } = getValidPosition(newX, newY);
            newY = y;
        }

        const tolerance = 0.1;
        if (Math.abs(newX - this.x) < tolerance) newX = this.x;
        if (Math.abs(newY - this.y) < tolerance) newY = this.y;
        this.x = newX;
        this.y = newY;

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
        const player = this.game.player;
        this.x = player.x - this.game.canvas.width / 2 + player.width / 2;
        this.y = player.y - this.game.canvas.height / 2 + player.height / 2;
        const mapWidth = this.game.mapWidth;
        const mapHeight = this.game.mapHeight;
        this.x = Math.max(0, Math.min(this.x, mapWidth - this.game.canvas.width));
        this.y = Math.max(0, Math.min(this.y, mapHeight - this.game.canvas.height));
    }
}

class Game {
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
        this.tooltip = null;

        this.generateMap();
        this.oreDeposits = OreDeposit.spawn(this, 10);
        this.player = new Player(this);
        this.camera = new Camera(this);

        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (!this.keys.includes(key)) this.keys.push(key);
            if (['w', 'a', 's', 'd', 'shift'].includes(key)) e.preventDefault();
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            const index = this.keys.indexOf(key);
            if (index > -1) this.keys.splice(index, 1);
            if (['w', 'a', 's', 'd', 'shift'].includes(key)) e.preventDefault();
        });

        this.canvas.addEventListener('mousemove', (e) => {
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
            this.tooltip = hoveredDeposit ? new Tooltip(this, hoveredDeposit) : null;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
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
            if (e.button === 0) {
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

        this.player.update(deltaTime);
        this.player.draw(context);

        if (this.tooltip) {
            this.tooltip.update(this.keys.includes('shift'));
            this.tooltip.draw(context);
        }

        if (this.mining.active && this.mining.ore) {
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
        context.fillStyle = 'green';
        this.miningFeedback = this.miningFeedback.filter(feedback => {
            const elapsed = (Date.now() - feedback.startTime) / 1000;
            if (elapsed < feedback.duration) {
                context.fillText(feedback.text, feedback.x, feedback.y);
                return true;
            }
            return false;
        });
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
    }
}

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