import { TOOLTIP_OFFSET_X, TOOLTIP_OFFSET_Y, TOOLTIP_PADDING, TOOLTIP_GAP_BETWEEN_SECTIONS, TOOLTIP_DEFAULT_HEIGHT, TOOLTIP_LINE_HEIGHT, DEFAULT_FONT_SIZE, EXPANDED_FONT_SIZE, MONSTER_DATA, ENEMY_DATA } from './Constants.js';

export class Tooltip {
    constructor(game, target) {
        this.game = game;
        this.target = target;
        this.visible = false;
        this.isExpanded = false;

        // Default positioning (bottom right, above energy status)
        this.x = this.game.width - TOOLTIP_OFFSET_X;
        this.y = this.game.height - TOOLTIP_OFFSET_Y;
        this.padding = TOOLTIP_PADDING;
        this.gapBetweenSections = TOOLTIP_GAP_BETWEEN_SECTIONS;
        this.defaultFont = `${DEFAULT_FONT_SIZE}px Impact`;
        this.expandedFont = `${EXPANDED_FONT_SIZE}px Impact`;
        this.defaultHeight = TOOLTIP_DEFAULT_HEIGHT;
        this.lineHeight = TOOLTIP_LINE_HEIGHT;
    }

    update(shiftHeld) {
        this.visible = !!this.target;
        if (!this.visible) return;

        this.isExpanded = this.visible && shiftHeld;

        this.game.context.font = this.defaultFont;
        if (this.target.resource_type) {
            this.defaultText = this.isExpanded ? `${this.target.resource_type}` : `${this.target.resource_type} (Shift)`;
        } else if (this.target.monsterType) {
            this.defaultText = this.isExpanded ? `${this.target.monsterType}` : `${this.target.monsterType} (Shift)`;
        } else if (this.target.enemyType) {
            this.defaultText = this.isExpanded ? `${this.target.enemyType}` : `${this.target.enemyType} (Shift)`;
        }
        this.defaultWidth = this.game.context.measureText(this.defaultText).width + this.padding * 2;

        if (this.isExpanded) {
            this.expandedLines = [];
            if (this.target.resource_type) {
                const { energyMin, energyMax } = this.game.OreDeposit.oreData[this.target.resource_type];
                this.expandedLines = [
                    `Contains ${energyMin}-${energyMax} Energy`,
                    `Hold left mouse button to mine`
                ];
            } else if (this.target.monsterType) {
                this.expandedLines = [MONSTER_DATA[this.target.monsterType].description];
            } else if (this.target.enemyType) {
                this.expandedLines = [ENEMY_DATA[this.target.enemyType].description];
            }
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

        const totalHeight = this.defaultHeight + (this.isExpanded ? this.gapBetweenSections : 0) + this.expandedHeight + this.padding;
        const energyY = this.game.height - 30;
        this.y = energyY - totalHeight - this.padding;
        this.x = this.game.width - Math.max(this.expandedWidth, this.defaultWidth);
    }

    draw(context) {
        if (!this.visible) return;

        const totalHeight = this.defaultHeight + (this.isExpanded ? this.gapBetweenSections : 0) + this.expandedHeight + this.padding;
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(this.x, this.y, this.expandedWidth, totalHeight);

        context.font = this.defaultFont;
        context.fillStyle = 'white';
        context.fillText(this.defaultText, this.x + this.padding, this.y + this.defaultHeight);

        if (this.isExpanded) {
            context.font = this.expandedFont;
            for (let i = 0; i < this.expandedLines.length; i++) {
                const lineY = this.y + this.defaultHeight + this.gapBetweenSections + (i * this.lineHeight);
                context.fillText(this.expandedLines[i], this.x + this.padding, lineY);
            }
        }
    }
}