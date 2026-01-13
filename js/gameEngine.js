/**
 * gameEngine.js
 * Fruit Catcher Game Logic
 * 
 * - 떨어지는 과일/폭탄 관리
 * - 바구니 이동 (Left/Center/Right)
 * - 충돌 처리 및 점수 계산
 */

class GameEngine {
    constructor() {
        // Game State
        this.score = 0;
        this.level = 1;
        this.timeLimit = 60;
        this.isGameActive = false;

        // Player State
        this.playerLane = 1; // 0: Left, 1: Center, 2: Right

        // Objects
        this.items = []; // Falling items
        this.itemsSpawned = 0; // Total items spawned counter
        this.lastSpawnTime = 0;
        this.spawnInterval = 1000; // ms

        // Settings
        this.lanes = [50, 150, 250]; // X coordinates for lanes (will be adjusted on resize)
        this.baseSpeed = 3;

        // Callbacks
        this.onScoreChange = null;
        this.onGameEnd = null;
        this.ctx = null;
        this.canvas = null;

        // Images (Placeholders)
        this.assets = {
            basket: "🛒",
            apple: "🍎",
            banana: "🍌",
            bomb: "💣",
            chicken: "🍗"
        };
    }

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        this.setupKeyboardInput(); // Add keyboard listener
    }

    setupKeyboardInput() {
        window.addEventListener('keydown', (e) => {
            if (!this.isGameActive) return;

            if (e.key === 'ArrowLeft') {
                this.playerLane = 0;
            } else if (e.key === 'ArrowRight') {
                this.playerLane = 2;
            } else if (e.key === 'ArrowDown' || e.key === ' ') {
                this.playerLane = 1;
            }
        });
    }

    resize() {
        if (!this.canvas) return;
        const width = this.canvas.width;
        // Divide width into 3 lanes
        this.lanes = [width * 0.16, width * 0.5, width * 0.84];
    }

    start(config = {}) {
        this.isGameActive = true;
        this.score = 0;
        this.level = 1;
        this.timeLimit = config.timeLimit || 60;
        this.items = [];
        this.itemsSpawned = 0;
        this.playerLane = 1; // Start at Center
        this.spawnInterval = 1000;

        this.lastTime = Date.now();
        this.gameLoop();

        this.startTimer();
    }

    stop() {
        this.isGameActive = false;
        if (this.timerInterval) clearInterval(this.timerInterval);

        if (this.onGameEnd) {
            this.onGameEnd(this.score, this.level);
        }
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timeLimit--;
            if (this.timeLimit <= 0) {
                this.stop();
            }
        }, 1000);
    }

    // Called by main.js when pose is detected
    onPoseDetected(poseLabel) {
        if (!this.isGameActive) return;

        // [Modified] Keyboard Only Mode
        // Pose inputs are ignored for control, but we keep the method structure.
        /*
        // Normalized comparison (ignore case)
        const label = poseLabel.toLowerCase();

        if (label === 'left') {
            this.playerLane = 0;
        } else if (label === 'right') {
            this.playerLane = 2;
        } else if (label === 'center') {
            this.playerLane = 1;
        }
        */
    }

    update() {
        const now = Date.now();
        const dt = (now - this.lastTime) / 16.66; // Normalize to ~60fps
        this.lastTime = now;

        // Spawn items
        if (now - this.lastSpawnTime > this.spawnInterval) {
            this.spawnItem();
            this.lastSpawnTime = now;
        }

        // Update items
        for (let i = this.items.length - 1; i >= 0; i--) {
            let item = this.items[i];
            item.y += item.speed * dt;

            // Collision Detection
            // Simple logic: if item is low enough and in same lane
            if (item.y > this.canvas.height - 80 && item.y < this.canvas.height - 20) {
                if (item.lane === this.playerLane) {
                    this.handleCollision(item);
                    this.items.splice(i, 1);
                    continue;
                }
            }

            // Remove if off screen
            if (item.y > this.canvas.height) {
                this.items.splice(i, 1);
            }
        }
    }

    spawnItem() {
        this.itemsSpawned++;

        const lane = Math.floor(Math.random() * 3); // 0, 1, 2
        let type = 'apple';
        let speed = this.baseSpeed + (this.level * 0.5);

        // Check for Chicken Spawn (Every 30th item)
        if (this.itemsSpawned % 30 === 0) {
            type = 'chicken';
            speed += 2; // Chicken is faster!
        } else {
            const typeRand = Math.random();
            if (typeRand > 0.9) {
                type = 'bomb'; // 10% chance
            } else if (typeRand > 0.7) {
                type = 'banana'; // 20% chance
            }
        }

        this.items.push({
            lane: lane,
            y: -50,
            type: type,
            speed: speed
        });
    }

    handleCollision(item) {
        if (item.type === 'bomb') {
            // Game Over
            this.stop();
            alert("💣 폭탄을 받았습니다! 게임 종료!");
        } else if (item.type === 'apple') {
            this.addScore(100);
        } else if (item.type === 'banana') {
            this.addScore(200);
        } else if (item.type === 'chicken') {
            this.addScore(1000);
        }
    }

    addScore(points) {
        this.score += points;

        // Level up
        if (this.score >= this.level * 1500) {
            this.level++;
            // Increase difficulty
            this.spawnInterval = Math.max(400, 1000 - (this.level * 100));
        }

        if (this.onScoreChange) {
            this.onScoreChange(this.score, this.level);
        }
    }

    draw() {
        if (!this.ctx) return;

        // Clear with background color (Black)
        this.ctx.fillStyle = "#111"; // Almost black
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Lanes
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // More visible lanes
        for (let x of this.lanes) {
            this.ctx.fillRect(x - 3, 0, 6, this.canvas.height);
        }

        // Helper to draw with glow
        const drawWithGlow = (text, x, y) => {
            this.ctx.save();
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = "white";
            this.ctx.font = "80px Arial"; // Bigger size
            this.ctx.textAlign = "center";
            this.ctx.fillText(text, x, y);
            this.ctx.restore();
        };

        // Draw Basket/Player
        const playerX = this.lanes[this.playerLane];
        drawWithGlow(this.assets.basket, playerX, this.canvas.height - 30);

        // Draw Items
        for (let item of this.items) {
            const x = this.lanes[item.lane];
            const icon = this.assets[item.type];
            drawWithGlow(icon, x, item.y);
        }

        // Draw HUD
        this.ctx.fillStyle = "white";
        this.ctx.font = "bold 20px Arial";
        this.ctx.textAlign = "left";
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        this.ctx.fillText(`Time: ${this.timeLimit}`, 10, 60);
        this.ctx.fillText(`Level: ${this.level}`, 10, 90);
    }

    gameLoop() {
        if (!this.isGameActive) return;

        this.update();
        this.draw(); // [Fix] Draw every frame independent of pose input

        requestAnimationFrame(() => this.gameLoop());
    }

    // Setters for callbacks
    setScoreChangeCallback(cb) { this.onScoreChange = cb; }
    setGameEndCallback(cb) { this.onGameEnd = cb; }
}

window.GameEngine = GameEngine;
