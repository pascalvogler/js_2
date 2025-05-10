export const TILE_SIZE = 50; // Size of each tile in pixels (for map, player, ores)
export const CANVAS_WIDTH = 1800; // Width of the game canvas in pixels
export const CANVAS_HEIGHT = 800; // Height of the game canvas in pixels
export const MAP_WIDTH = 2000; // Total width of the game map in pixels
export const MAP_HEIGHT = 2000; // Total height of the game map in pixels
export const NUM_WALL_WALKS = 5; // Number of random walks for wall generation
export const NUM_WATER_WALKS = 3; // Number of random walks for water generation
export const WALL_WALK_LENGTH = 20; // Length of each wall walk in map generation
export const WATER_WALK_LENGTH = 15; // Length of each water walk in map generation
export const MINING_RANGE = 75; // Max distance (pixels) for player to mine ore
export const NUM_ORE_DEPOSITS = 10; // Number of ore deposits to spawn
export const NUM_MONSTERS = 5; // Number of monsters to spawn
export const NUM_ENEMIES = 3; // Number of enemies to spawn
export const AGGRO_RADIUS = 300; // Distance (pixels) for enemies to detect player
export const PLAYER_SPEED = 200; // Player movement speed in pixels per second
export const NPC_SPEED = PLAYER_SPEED * 0.25; // NPC movement speed (25% of player speed)
export const MOVEMENT_TOLERANCE = 0.1; // Tolerance for snapping small movements
export const PROGRESS_BAR_HEIGHT = 10; // Height of mining progress bar in pixels
export const PROGRESS_BAR_OFFSET = 2; // Vertical offset of progress bar in pixels
export const TOOLTIP_OFFSET_X = 200; // Horizontal offset of tooltip from right edge
export const TOOLTIP_OFFSET_Y = 40; // Vertical offset of tooltip from bottom edge
export const TOOLTIP_PADDING = 10; // Padding inside the tooltip in pixels
export const TOOLTIP_GAP_BETWEEN_SECTIONS = 15; // Gap between tooltip sections in pixels
export const TOOLTIP_DEFAULT_HEIGHT = 16; // Height of default tooltip section in pixels
export const TOOLTIP_LINE_HEIGHT = 16; // Height of each expanded tooltip line in pixels
export const DEFAULT_FONT_SIZE = 16; // Font size for default tooltip text in pixels
export const EXPANDED_FONT_SIZE = 14; // Font size for expanded tooltip text in pixels
export const ENERGY_WINDOW_HEIGHT = 30; // Height of energy window in pixels
export const ENERGY_WINDOW_PADDING = 10; // Padding inside energy window in pixels
export const PAUSE_TEXT_SIZE = 48; // Font size for "Paused" text in pixels
export const PLAYER_ATTACK_RADIUS = 200; // Radius (pixels) for player to auto-attack enemies
export const PLAYER_ATTACK_DAMAGE = 5; // Damage dealt by player per attack
export const PLAYER_ATTACK_SPEED = 1; // Attacks per second
export const PLAYER_MULTISHOT_TARGETS = 1; // Number of enemies the player can target simultaneously
// Ore types with spawn probabilities and energy ranges
export const ORE_DATA = {
    'Lavasteel': { probability: 70, energyMin: 1, energyMax: 3 }, // 70% chance, 1-3 energy
    'Mithril': { probability: 25, energyMin: 2, energyMax: 6 }, // 25% chance, 2-6 energy
    'Obsidianite': { probability: 5, energyMin: 8, energyMax: 12 } // 5% chance, 8-12 energy
};
// Monster types with spawn probabilities, HP ranges, colors, and descriptions
export const MONSTER_DATA = {
    'Fluffel': { probability: 40, hpMin: 10, hpMax: 20, color: '#FFD700', description: 'A fluffy creature that loves to nap.' },
    'Grumblet': { probability: 30, hpMin: 15, hpMax: 25, color: '#8B4513', description: 'A grumpy beast with a loud roar.' },
    'Sparkleon': { probability: 15, hpMin: 20, hpMax: 30, color: '#FF69B4', description: 'A shiny creature that glows in the dark.' },
    'Rocko': { probability: 10, hpMin: 25, hpMax: 35, color: '#808080', description: 'A sturdy rock-like monster with a tough shell.' },
    'Wispwing': { probability: 5, hpMin: 30, hpMax: 40, color: '#87CEEB', description: 'A wispy flyer that drifts with the wind.' }
};
// Enemy types with spawn probabilities, HP ranges, descriptions, and letters
export const ENEMY_DATA = {
    'Goblin': { probability: 50, hpMin: 20, hpMax: 30, description: 'A sneaky creature with sharp claws.', letter: 'G' },
    'Troll': { probability: 30, hpMin: 30, hpMax: 40, description: 'A large brute that guards its territory.', letter: 'T' },
    'Wraith': { probability: 20, hpMin: 25, hpMax: 35, description: 'A ghostly figure with a chilling presence.', letter: 'W' }
};