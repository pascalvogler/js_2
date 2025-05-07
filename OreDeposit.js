export class OreDeposit {
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