import { NPC } from './NPC.js';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, MONSTER_DATA, NUM_MONSTERS } from './Constants.js';
import { Enemy } from './Enemy.js';

export class Monster extends NPC {
    constructor(x, y, monsterType, hp, chanceToCatch) {
        super(x, y, monsterType, hp, MONSTER_DATA[monsterType].color);
        this.monsterType = monsterType;
        this.chanceToCatch = chanceToCatch;
        this.tamed = false;
        this.followDistance = 100; // Distance to maintain from player when tamed
    }

    static spawn(game) {
        const monsters = [];
        const monsterTypes = Object.keys(MONSTER_DATA);
        const cumulativeProbabilities = [];
        let cumulative = 0;
        for (let type of monsterTypes) {
            cumulative += MONSTER_DATA[type].probability;
            cumulativeProbabilities.push({ type, threshold: cumulative });
        }

        for (let i = 0; i < NUM_MONSTERS; i++) {
            let x, y;
            let isValidPosition;
            do {
                x = Math.floor(Math.random() * MAP_WIDTH / TILE_SIZE) * TILE_SIZE;
                y = Math.floor(Math.random() * MAP_HEIGHT / TILE_SIZE) * TILE_SIZE;
                isValidPosition = game.isWalkable(x, y, TILE_SIZE, TILE_SIZE) &&
                    !monsters.some(m => m.x === x && m.y === y) &&
                    !game.oreDeposits.some(d => d.x === x && d.y === y);
            } while (!isValidPosition);

            const rand = Math.random() * 100;
            let monsterType = monsterTypes[0];
            for (let { type, threshold } of cumulativeProbabilities) {
                if (rand <= threshold) {
                    monsterType = type;
                    break;
                }
            }

            const { hpMin, hpMax, chanceToCatchMin, chanceToCatchMax } = MONSTER_DATA[monsterType];
            const hp = Math.floor(Math.random() * (hpMax - hpMin + 1)) + hpMin;
            const chanceToCatch = Math.random() * (chanceToCatchMax - chanceToCatchMin) + chanceToCatchMin;

            monsters.push(new Monster(x, y, monsterType, hp, chanceToCatch));
        }
        return monsters;
    }

    convertToEnemy(game) {
        console.log(`Monster ${this.monsterType} failed to be tamed, converting to enemy`);
        const enemy = new Enemy(this.x, this.y, this.monsterType, this.hp, this.monsterType[0].toUpperCase());
        game.enemies.push(enemy);
        game.monsters = game.monsters.filter(monster => monster !== this);
    }

    followPlayer(game, deltaTime) {
        const player = game.player;
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.followDistance) {
            const speed = this.speed * (deltaTime / 1000);
            const angle = Math.atan2(dy, dx);
            const moveDx = Math.cos(angle) * speed;
            const moveDy = Math.sin(angle) * speed;
            this.move(game, moveDx, moveDy);
        }
    }

    update(deltaTime, player, game) {
        if (this.tamed) {
            this.followPlayer(game, deltaTime);
        } else {
            this.wander(game, deltaTime);
        }
    }
}