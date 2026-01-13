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
            bomb: "💣"
        };
    }

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
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

        // Normalized comparison (ignore case)
        const label = poseLabel.toLowerCase();

        if (label === 'left') {
            this.playerLane = 0;
        } else if (label === 'right') {
            this.playerLane = 2;
        } else if (label === 'center') {
            this.playerLane = 1;
        }
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
        const lane = Math.floor(Math.random() * 3); // 0, 1, 2
        const typeRand = Math.random();
        let type = 'apple';
        let speed = this.baseSpeed + (this.level * 0.5);

        if (typeRand > 0.9) {
            type = 'bomb'; // 10% chance
        } else if (typeRand > 0.7) {
            type = 'banana'; // 20% chance
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
        }
    }

    addScore(points) {
        this.score += points;
        
        // Level up
        if (this.score >= this.level * 500) {
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

        // Clear previous frame (partial clear if needed, but normally main.js handles canvas clear)
        // Here we draw ON TOP of the webcam feed usually, or on a separate canvas.
        // Assuming we share the canvas or have our own. 
        // Let's assume we are drawing on the same context passed in init()
        
        // NOTE: main.js clears canvas for webcam. we should draw after webcam.
        
        // Draw Lanes (Optional visualization)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for (let x of this.lanes) {
            this.ctx.fillRect(x - 2, 0, 4, this.canvas.height);
        }

        // Draw Basket/Player
        const playerX = this.lanes[this.playerLane];
        this.ctx.font = "60px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(this.assets.basket, playerX, this.canvas.height - 30);

        // Draw Items
        for (let item of this.items) {
            const x = this.lanes[item.lane];
            const icon = this.assets[item.type];
            this.ctx.fillText(icon, x, item.y);
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
        // Drawing is handled by main.js loop usually? 
        // Actually main.js loop calls poseEngine. 
        // We should hook into the drawPose or a centralized loop.
        // For now, let's expose specific update/draw methods that main.js can call.
        
        requestAnimationFrame(() => this.gameLoop());
    }

    // Setters for callbacks
    setScoreChangeCallback(cb) { this.onScoreChange = cb; }
    setGameEndCallback(cb) { this.onGameEnd = cb; }
}

window.GameEngine = GameEngine;
