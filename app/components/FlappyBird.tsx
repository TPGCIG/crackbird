'use client'

import { useEffect, useRef, useState } from 'react'

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start')
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)

  const gameDataRef = useRef({
    bird: {
      x: 50,
      y: 300,
      width: 34,
      height: 24,
      velocity: 0,
      gravity: 0.5,
      jump: -8,
      rotation: 0,
    },
    pipes: [] as any[],
    pipeTimer: 0,
    pipeInterval: 100,
    pipeSpeed: 2,
    pipeWidth: 80,
    pipeGap: 150,
    background: {
      clouds: [] as any[],
      ground: 0,
    },
    animationId: null as number | null,
    gameState: 'start' as 'start' | 'playing' | 'gameover',
  })

  useEffect(() => {
    const stored = localStorage.getItem('bestScore')
    if (stored) {
      setBestScore(parseInt(stored))
    }
    initBackground()
  }, [])

  const initBackground = () => {
    const clouds = []
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * 400,
        y: Math.random() * 200,
        width: 60 + Math.random() * 40,
        speed: 0.2 + Math.random() * 0.3,
      })
    }
    gameDataRef.current.background.clouds = clouds
  }

  const startGame = () => {
    setGameState('playing')
    gameDataRef.current.gameState = 'playing'
    setScore(0)
    gameDataRef.current.bird.y = 300
    gameDataRef.current.bird.velocity = 0
    gameDataRef.current.bird.rotation = 0
    gameDataRef.current.pipes = []
    gameDataRef.current.pipeTimer = 0
    gameDataRef.current.background.ground = 0
    initBackground()
    requestAnimationFrame(gameLoop)
  }

  const handleGameOver = () => {
    setGameState('gameover')
    gameDataRef.current.gameState = 'gameover'
    if (score > bestScore) {
      setBestScore(score)
      localStorage.setItem('bestScore', score.toString())
    }
    if (gameDataRef.current.animationId) {
      cancelAnimationFrame(gameDataRef.current.animationId)
    }
  }

  const handleFlap = () => {
    if (gameDataRef.current.gameState === 'playing') {
      gameDataRef.current.bird.velocity = gameDataRef.current.bird.jump
    }
  }

  const gameLoop = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { bird, pipes, background } = gameDataRef.current

    // Update
    if (gameDataRef.current.gameState === 'playing') {
      // Update bird
      bird.velocity += bird.gravity
      bird.y += bird.velocity
      bird.rotation = Math.min(Math.max(bird.velocity * 3, -30), 90)

      // Check boundaries
      if (bird.y < 0 || bird.y + bird.height > 600 - 50) {
        handleGameOver()
        return
      }

      // Update background
      background.clouds.forEach((cloud: any) => {
        cloud.x -= cloud.speed
        if (cloud.x + cloud.width < 0) {
          cloud.x = 400
        }
      })
      background.ground -= gameDataRef.current.pipeSpeed
      if (background.ground <= -50) {
        background.ground = 0
      }

      // Update pipes
      gameDataRef.current.pipeTimer++
      if (gameDataRef.current.pipeTimer >= gameDataRef.current.pipeInterval) {
        const pipeGapY = Math.random() * (600 - 200 - gameDataRef.current.pipeGap) + 100
        pipes.push({
          x: 400,
          gapY: pipeGapY,
          passed: false,
        })
        gameDataRef.current.pipeTimer = 0
      }

      for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i]
        pipe.x -= gameDataRef.current.pipeSpeed

        // Check if passed
        if (!pipe.passed && bird.x > pipe.x + gameDataRef.current.pipeWidth) {
          pipe.passed = true
          setScore((s) => s + 1)
        }

        // Remove off-screen pipes
        if (pipe.x + gameDataRef.current.pipeWidth < 0) {
          pipes.splice(i, 1)
          continue
        }

        // Check collision
        if (
          bird.x + bird.width > pipe.x &&
          bird.x < pipe.x + gameDataRef.current.pipeWidth
        ) {
          if (
            bird.y < pipe.gapY ||
            bird.y + bird.height > pipe.gapY + gameDataRef.current.pipeGap
          ) {
            handleGameOver()
            return
          }
        }
      }
    }

    // Draw
    ctx.clearRect(0, 0, 400, 600)

    // Draw sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 600)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(1, '#98D8C8')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 400, 600)

    // Draw clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    background.clouds.forEach((cloud: any) => {
      ctx.beginPath()
      ctx.arc(cloud.x, cloud.y, cloud.width / 2, 0, Math.PI * 2)
      ctx.arc(cloud.x + cloud.width / 3, cloud.y, cloud.width / 2.5, 0, Math.PI * 2)
      ctx.arc(cloud.x - cloud.width / 3, cloud.y, cloud.width / 2.5, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw ground
    ctx.fillStyle = '#8B7355'
    ctx.fillRect(0, 550, 400, 50)
    ctx.strokeStyle = '#6B5945'
    ctx.lineWidth = 2
    for (let i = background.ground; i < 400; i += 50) {
      ctx.beginPath()
      ctx.moveTo(i, 550)
      ctx.lineTo(i, 600)
      ctx.stroke()
    }

    // Draw pipes
    pipes.forEach((pipe: any) => {
      // Top pipe
      ctx.fillStyle = '#22C55E'
      ctx.fillRect(pipe.x, 0, gameDataRef.current.pipeWidth, pipe.gapY)
      ctx.fillStyle = '#1F9F4B'
      ctx.fillRect(pipe.x - 5, pipe.gapY - 30, gameDataRef.current.pipeWidth + 10, 30)

      // Bottom pipe
      ctx.fillStyle = '#22C55E'
      ctx.fillRect(
        pipe.x,
        pipe.gapY + gameDataRef.current.pipeGap,
        gameDataRef.current.pipeWidth,
        600 - pipe.gapY - gameDataRef.current.pipeGap
      )
      ctx.fillStyle = '#1F9F4B'
      ctx.fillRect(
        pipe.x - 5,
        pipe.gapY + gameDataRef.current.pipeGap,
        gameDataRef.current.pipeWidth + 10,
        30
      )
    })

    // Draw bird
    ctx.save()
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2)
    ctx.rotate((bird.rotation * Math.PI) / 180)

    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.ellipse(0, 0, bird.width / 2, bird.height / 2, 0, 0, Math.PI * 2)
    ctx.fill()

    // Eye
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.arc(8, -5, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'black'
    ctx.beginPath()
    ctx.arc(10, -5, 3, 0, Math.PI * 2)
    ctx.fill()

    // Beak
    ctx.fillStyle = '#FFA500'
    ctx.beginPath()
    ctx.moveTo(bird.width / 2, 0)
    ctx.lineTo(bird.width / 2 + 8, 3)
    ctx.lineTo(bird.width / 2, 6)
    ctx.closePath()
    ctx.fill()

    // Wing
    ctx.fillStyle = '#FFD700'
    ctx.strokeStyle = '#FFA500'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(-5, 2, 12, 8, (-20 * Math.PI) / 180, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.restore()

    if (gameDataRef.current.gameState === 'playing') {
      gameDataRef.current.animationId = requestAnimationFrame(gameLoop)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameDataRef.current.gameState === 'playing') {
        e.preventDefault()
        handleFlap()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div id="gameContainer">
      <canvas
        ref={canvasRef}
        width={400}
        height={600}
        onClick={handleFlap}
        onTouchStart={(e) => {
          e.preventDefault()
          handleFlap()
        }}
      />

      {gameState === 'playing' && (
        <div className="score">{score}</div>
      )}

      {gameState === 'start' && (
        <div className="startScreen">
          <h1>🐦 Flappy Bird</h1>
          <div className="instructions">
            <p>Tap or Click to make the bird fly</p>
            <p>Avoid the pipes!</p>
          </div>
          <button className="button" onClick={startGame}>
            Start Game
          </button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="gameOverScreen">
          <h1>Game Over!</h1>
          <div className="scoreDisplay">Score: {score}</div>
          <div className="scoreDisplay">Best: {bestScore}</div>
          <button className="button" onClick={startGame}>
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}
