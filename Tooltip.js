export class Tooltip {
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
        if (!this.visible) return;

        this.isExpanded = this.visible && shiftHeld;

        this.game.context.font = this.defaultFont;
        this.defaultText = `${this.target.resource_type} (Shift)`;
        this.defaultWidth = this.game.context.measureText(this.defaultText).width + this.padding * 2;

        if (this.isExpanded) {
            const { energyMin, energyMax } = this.game.OreDeposit.oreData[this.target.resource_type];
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