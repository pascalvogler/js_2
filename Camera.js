export class Camera {
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