import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, NPC_SPEED } from './Constants.js';

export class NPC {
    constructor(x, y, type, hp, color) {
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.type = type;
        this.hp = hp;
        this.color = color;

        // Wandering state
        this.state = 'moving'; // 'moving' or 'paused'
        this.direction = Math.floor(Math.random() * 4); // 0: left, 1: right, 2: up, 3: down
        this.moveTime = this.getRandomMoveTime(); // Time to move (3-10 seconds)
        this.pauseTime = this.getRandomPauseTime(); // Time to pause (1-8 seconds)
        this.currentTime = 0; // Track elapsed time in current state
        console.log(`NPC ${this.type} initialized with state=${this.state}, moveTime=${this.moveTime}, pauseTime=${this.pauseTime}`);
    }

    getRandomMoveTime() {
        return Math.random() * (10 - 3) + 3; // Random between 3 and 10 seconds
    }

    getRandomPauseTime() {
        return Math.random() * (8 - 1) + 1; // Random between 1 and 8 seconds
    }

    findWalkableDirection(game) {
        const directions = [
            { dx: -1, dy: 0 }, // Left
            { dx: 1, dy: 0 },  // Right
            { dx: 0, dy: -1 }, // Up
            { dx: 0, dy: 1 }   // Down
        ];
        let attempts = 0;
        const maxAttempts = 4;

        while (attempts < maxAttempts) {
            const dir = directions[Math.floor(Math.random() * 4)];
            const newX = this.x + dir.dx * TILE_SIZE;
            const newY = this.y + dir.dy * TILE_SIZE;

            if (game.isWalkable(newX, newY, this.width, this.height)) {
                this.direction = directions.indexOf(dir);
                return { dx: dir.dx * TILE_SIZE, dy: dir.dy * TILE_SIZE };
            }
            attempts++;
        }
        return null;
    }

    move(game, deltaTime) {
        let dx = 0, dy = 0;
        const speed = NPC_SPEED * (deltaTime / 1000); // Convert deltaTime to seconds
        const maxStep = 5; // Limit maximum step size

        if (this.direction === 0) dx = -Math.min(speed, maxStep); // Left
        else if (this.direction === 1) dx = Math.min(speed, maxStep); // Right
        else if (this.direction === 2) dy = -Math.min(speed, maxStep); // Up
        else if (this.direction === 3) dy = Math.min(speed, maxStep); // Down

        const newX = this.x + dx;
        const newY = this.y + dy;

        console.log(`NPC ${this.type} attempting move: dx=${dx}, dy=${dy}, newX=${newX}, newY=${newY}`);

        // Boundary checks
        if (newX < 0 || newX + this.width > MAP_WIDTH) {
            console.log(`NPC ${this.type} hit boundary, finding new direction`);
            const move = this.findWalkableDirection(game);
            if (move) {
                this.x += move.dx;
                this.y += move.dy;
                console.log(`NPC ${this.type} moved to x=${this.x}, y=${this.y}`);
            } else {
                this.state = 'paused';
                this.currentTime = 0;
                this.pauseTime = this.getRandomPauseTime();
            }
            return;
        }
        if (newY < 0 || newY + this.height > MAP_HEIGHT) {
            console.log(`NPC ${this.type} hit boundary, finding new direction`);
            const move = this.findWalkableDirection(game);
            if (move) {
                this.x += move.dx;
                this.y += move.dy;
                console.log(`NPC ${this.type} moved to x=${this.x}, y=${this.y}`);
            } else {
                this.state = 'paused';
                this.currentTime = 0;
                this.pauseTime = this.getRandomPauseTime();
            }
            return;
        }

        // Collision check
        if (game.isWalkable(newX, newY, this.width, this.height)) {
            this.x = newX;
            this.y = newY;
            console.log(`NPC ${this.type} moved to x=${this.x}, y=${this.y}`);
        } else {
            console.log(`NPC ${this.type} collided, finding new direction`);
            const move = this.findWalkableDirection(game);
            if (move) {
                this.x += move.dx;
                this.y += move.dy;
                console.log(`NPC ${this.type} moved to x=${this.x}, y=${this.y}`);
            } else {
                this.state = 'paused';
                this.currentTime = 0;
                this.pauseTime = this.getRandomPauseTime();
            }
        }
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
                this.direction = Math.floor(Math.random() * 4);
            }
        }
    }

    update(deltaTime, player, game) {
        // To be overridden by subclasses
    }

    draw(context) {
        context.fillStyle = this.color;
        context.fillRect(this.x, this.y, this.width, this.height);
    }
}