import { NPC } from './NPC.js';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, MONSTER_DATA, NUM_MONSTERS } from './Constants.js';

export class Monster extends NPC {
    constructor(x, y, monsterType, hp) {
        super(x, y, monsterType, hp, MONSTER_DATA[monsterType].color);
        this.monsterType = monsterType;
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

            const { hpMin, hpMax } = MONSTER_DATA[monsterType];
            const hp = Math.floor(Math.random() * (hpMax - hpMin + 1)) + hpMin;

            monsters.push(new Monster(x, y, monsterType, hp));
        }
        return monsters;
    }

    update(deltaTime, player, game) {
        this.wander(game, deltaTime);
    }
}