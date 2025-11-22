// Game Configuration
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');
const bestScoreElement = document.getElementById('bestScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');

// Set canvas size
function resizeCanvas() {
    canvas.width = 400;
    canvas.height = 600;
}
resizeCanvas();

// Game Variables
let gameState = 'start'; // 'start', 'playing', 'gameover'
let score = 0;
let bestScore = localStorage.getItem('bestScore') || 0;
let animationId;

// Bird Object
const bird = {
    x: 50,
    y: canvas.height / 2,
    width: 34,
    height: 24,
    velocity: 0,
    gravity: 0.5,
    jump: -8,
    rotation: 0,
    
    update() {
        if (gameState === 'playing') {
            this.velocity += this.gravity;
            this.y += this.velocity;
            
            // Calculate rotation based on velocity
            this.rotation = Math.min(Math.max(this.velocity * 3, -30), 90);
        }
    },
    
    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation * Math.PI / 180);
        
        // Draw bird body (yellow)
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(8, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(10, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw beak
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(this.width / 2 + 8, 3);
        ctx.lineTo(this.width / 2, 6);
        ctx.closePath();
        ctx.fill();
        
        // Draw wing
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(-5, 2, 12, 8, -20 * Math.PI / 180, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    },
    
    flap() {
        if (gameState === 'playing') {
            this.velocity = this.jump;
        }
    },
    
    reset() {
        this.y = canvas.height / 2;
        this.velocity = 0;
        this.rotation = 0;
    }
};

// Pipes Array
const pipes = [];
const pipeWidth = 80;
const pipeGap = 150;
const pipeSpeed = 2;
let pipeTimer = 0;
const pipeInterval = 100;

// Pipe Class
class Pipe {
    constructor() {
        this.x = canvas.width;
        this.width = pipeWidth;
        this.gap = pipeGap;
        this.gapY = Math.random() * (canvas.height - 200 - this.gap) + 100;
        this.passed = false;
        this.color = '#22C55E';
    }
    
    update() {
        this.x -= pipeSpeed;
        
        // Check if bird passed the pipe
        if (!this.passed && bird.x > this.x + this.width) {
            this.passed = true;
            score++;
            scoreElement.textContent = score;
        }
    }
    
    draw() {
        // Top pipe
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, 0, this.width, this.gapY);
        
        // Top pipe cap
        ctx.fillStyle = '#1F9F4B';
        ctx.fillRect(this.x - 5, this.gapY - 30, this.width + 10, 30);
        
        // Bottom pipe
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.gapY + this.gap, this.width, canvas.height - this.gapY - this.gap);
        
        // Bottom pipe cap
        ctx.fillStyle = '#1F9F4B';
        ctx.fillRect(this.x - 5, this.gapY + this.gap, this.width + 10, 30);
    }
    
    checkCollision() {
        // Check collision with bird
        if (bird.x + bird.width > this.x && bird.x < this.x + this.width) {
            if (bird.y < this.gapY || bird.y + bird.height > this.gapY + this.gap) {
                return true;
            }
        }
        return false;
    }
}

// Background
const background = {
    clouds: [],
    ground: 0,
    
    init() {
        // Generate random clouds
        this.clouds = [];
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * canvas.width,
                y: Math.random() * 200,
                width: 60 + Math.random() * 40,
                speed: 0.2 + Math.random() * 0.3
            });
        }
    },
    
    update() {
        // Move clouds
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if (cloud.x + cloud.width < 0) {
                cloud.x = canvas.width;
            }
        });
        
        // Move ground
        if (gameState === 'playing') {
            this.ground -= pipeSpeed;
            if (this.ground <= -50) {
                this.ground = 0;
            }
        }
    },
    
    draw() {
        // Sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98D8C8');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.clouds.forEach(cloud => {
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, cloud.width / 2, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.width / 3, cloud.y, cloud.width / 2.5, 0, Math.PI * 2);
            ctx.arc(cloud.x - cloud.width / 3, cloud.y, cloud.width / 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw ground
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
        
        // Draw ground pattern
        ctx.strokeStyle = '#6B5945';
        ctx.lineWidth = 2;
        for (let i = this.ground; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, canvas.height - 50);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
    }
};

// Game Functions
function startGame() {
    gameState = 'playing';
    startScreen.style.display = 'none';
    scoreElement.style.display = 'block';
    score = 0;
    scoreElement.textContent = score;
    bird.reset();
    pipes.length = 0;
    pipeTimer = 0;
    background.init();
    gameLoop();
}

function gameOver() {
    gameState = 'gameover';
    finalScoreElement.textContent = score;
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
    }
    bestScoreElement.textContent = bestScore;
    
    gameOverScreen.style.display = 'flex';
    scoreElement.style.display = 'none';
    cancelAnimationFrame(animationId);
}

function restartGame() {
    gameOverScreen.style.display = 'none';
    startGame();
}

function update() {
    if (gameState !== 'playing') return;
    
    // Update background
    background.update();
    
    // Update bird
    bird.update();
    
    // Check boundaries
    if (bird.y < 0 || bird.y + bird.height > canvas.height - 50) {
        gameOver();
    }
    
    // Update pipes
    pipeTimer++;
    if (pipeTimer >= pipeInterval) {
        pipes.push(new Pipe());
        pipeTimer = 0;
    }
    
    pipes.forEach((pipe, index) => {
        pipe.update();
        
        // Remove off-screen pipes
        if (pipe.x + pipe.width < 0) {
            pipes.splice(index, 1);
        }
        
        // Check collision
        if (pipe.checkCollision()) {
            gameOver();
        }
    });
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    background.draw();
    
    // Draw pipes
    pipes.forEach(pipe => pipe.draw());
    
    // Draw bird
    bird.draw();
}

function gameLoop() {
    update();
    draw();
    
    if (gameState === 'playing') {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Event Listeners
canvas.addEventListener('click', () => {
    if (gameState === 'playing') {
        bird.flap();
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
        bird.flap();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameState === 'playing') {
        e.preventDefault();
        bird.flap();
    }
});

// Initialize
window.addEventListener('load', () => {
    bestScoreElement.textContent = bestScore;
    background.init();
});

// Handle window resize
window.addEventListener('resize', () => {
    // You can add responsive canvas sizing here if needed
});