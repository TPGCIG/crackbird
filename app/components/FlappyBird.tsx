'use client'

import { useEffect, useRef, useState } from 'react'

interface Question {
  category: string
  question: string
  options: string[]
  correct_option_index: number
  explanation: string
}

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start')
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [quizActive, setQuizActive] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isSpedUp, setIsSpedUp] = useState(false)
  const [shouldSpeedUp, setShouldSpeedUp] = useState(false)
  const speedBoostTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  const audioRefs = useRef({
    jump: null as HTMLAudioElement | null,
    gameOver: null as HTMLAudioElement | null,
    goodBoy: null as HTMLAudioElement | null,
    mainGameLoop: null as HTMLAudioElement | null,
    passPoint: null as HTMLAudioElement | null,
    wrongResponse: null as HTMLAudioElement | null,
  })

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
    quizActive: false,
    countdownActive: false,
    isSpedUp: false,
  })

  useEffect(() => {
    const stored = localStorage.getItem('bestScore')
    if (stored) {
      setBestScore(parseInt(stored))
    }
    // Detect touch device
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)

    // Load audio files
    audioRefs.current.jump = new Audio('/sounds/jump.mp3')
    audioRefs.current.gameOver = new Audio('/sounds/game over - sound effect.mp3')
    audioRefs.current.goodBoy = new Audio('/sounds/Good_boy.mp3')
    audioRefs.current.mainGameLoop = new Audio('/sounds/main_game_loop.mp3')
    audioRefs.current.passPoint = new Audio('/sounds/pass_point.mp3')
    audioRefs.current.wrongResponse = new Audio('/sounds/wrong_response.mp3')

    // Set background music to loop
    if (audioRefs.current.mainGameLoop) {
      audioRefs.current.mainGameLoop.loop = true
      audioRefs.current.mainGameLoop.volume = 0.3
    }

    initBackground()
    loadQuestions()
  }, [])

  useEffect(() => {
    if (questions.length > 0) {
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(questions.map(q => q.category)))
      setCategories(uniqueCategories)

      // Load selected categories from localStorage, default to all
      const storedCategories = localStorage.getItem('selectedCategories')
      if (storedCategories) {
        setSelectedCategories(JSON.parse(storedCategories))
      } else {
        setSelectedCategories(uniqueCategories)
      }
    }
  }, [questions])

  const loadQuestions = async () => {
    try {
      const response = await fetch('/data/questions.json')
      const data = await response.json()
      setQuestions(data.quiz_collection)
    } catch (error) {
      console.error('Failed to load questions:', error)
    }
  }

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
    gameDataRef.current.quizActive = false
    gameDataRef.current.countdownActive = false
    gameDataRef.current.isSpedUp = false
    setQuizActive(false)
    setCountdown(null)
    setIsSpedUp(false)
    setShouldSpeedUp(false)
    if (speedBoostTimerRef.current) {
      clearTimeout(speedBoostTimerRef.current)
      speedBoostTimerRef.current = null
    }

    // Play background music
    if (audioRefs.current.mainGameLoop) {
      audioRefs.current.mainGameLoop.currentTime = 0
      audioRefs.current.mainGameLoop.play().catch(() => {})
    }

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
    // Clear speed boost timer
    if (speedBoostTimerRef.current) {
      clearTimeout(speedBoostTimerRef.current)
      speedBoostTimerRef.current = null
    }
    gameDataRef.current.isSpedUp = false
    setIsSpedUp(false)
    setShouldSpeedUp(false)

    // Stop background music and play game over sound
    if (audioRefs.current.mainGameLoop) {
      audioRefs.current.mainGameLoop.pause()
    }
    if (audioRefs.current.gameOver) {
      audioRefs.current.gameOver.currentTime = 0
      audioRefs.current.gameOver.play().catch(() => {})
    }
  }

  const handleFlap = () => {
    if (gameDataRef.current.gameState === 'playing' && !gameDataRef.current.quizActive && !gameDataRef.current.countdownActive) {
      gameDataRef.current.bird.velocity = gameDataRef.current.bird.jump

      // Play jump sound
      if (audioRefs.current.jump) {
        audioRefs.current.jump.currentTime = 0
        audioRefs.current.jump.play().catch(() => {})
      }

      // 15% chance to trigger a quiz
      if (Math.random() < 0.15 && questions.length > 0) {
        triggerQuiz()
      }
    }
  }

  const triggerQuiz = () => {
    // Cancel the animation frame to pause the game
    if (gameDataRef.current.animationId) {
      cancelAnimationFrame(gameDataRef.current.animationId)
      gameDataRef.current.animationId = null
    }

    // Pause background music during quiz
    if (audioRefs.current.mainGameLoop) {
      audioRefs.current.mainGameLoop.pause()
    }

    // Filter questions by selected categories
    const filteredQuestions = questions.filter(q => selectedCategories.includes(q.category))

    // If no categories selected, use all questions
    const availableQuestions = filteredQuestions.length > 0 ? filteredQuestions : questions

    const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)]
    setCurrentQuestion(randomQuestion)
    setQuizActive(true)
    gameDataRef.current.quizActive = true
    setSelectedAnswer(null)
    setShowExplanation(false)
  }

  const handleQuizAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex)
    setShowExplanation(true)

    // Play correct or wrong sound
    if (currentQuestion) {
      const isCorrect = answerIndex === currentQuestion.correct_option_index
      if (isCorrect && audioRefs.current.goodBoy) {
        audioRefs.current.goodBoy.currentTime = 0
        audioRefs.current.goodBoy.play().catch(() => {})
      } else if (!isCorrect && audioRefs.current.wrongResponse) {
        audioRefs.current.wrongResponse.currentTime = 0
        audioRefs.current.wrongResponse.play().catch(() => {})
      }
    }
  }

  const resumeGame = (isCorrect: boolean) => {
    setQuizActive(false)
    gameDataRef.current.quizActive = false
    setCurrentQuestion(null)
    setSelectedAnswer(null)
    setShowExplanation(false)

    if (isCorrect) {
      // Correct answer: Start countdown
      setShouldSpeedUp(false)
      setCountdown(3)
      gameDataRef.current.countdownActive = true
    } else {
      // Wrong answer: Mark that we should speed up after countdown
      setShouldSpeedUp(true)
      setCountdown(3)
      gameDataRef.current.countdownActive = true
    }
  }

  // Handle countdown timer
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      // Countdown finished, resume game
      setCountdown(null)
      gameDataRef.current.countdownActive = false

      // If we should speed up (wrong answer), activate it now
      if (shouldSpeedUp) {
        setIsSpedUp(true)
        gameDataRef.current.isSpedUp = true
        setShouldSpeedUp(false)

        // Clear any existing timer
        if (speedBoostTimerRef.current) {
          clearTimeout(speedBoostTimerRef.current)
        }

        // Set timer to remove speed boost after 3 seconds of gameplay
        speedBoostTimerRef.current = setTimeout(() => {
          setIsSpedUp(false)
          gameDataRef.current.isSpedUp = false
          speedBoostTimerRef.current = null
        }, 3000)
      }

      // Resume background music
      if (audioRefs.current.mainGameLoop) {
        audioRefs.current.mainGameLoop.play().catch(() => {})
      }

      requestAnimationFrame(gameLoop)
    }
  }, [countdown, shouldSpeedUp])

  const gameLoop = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { bird, pipes, background } = gameDataRef.current

    // Calculate current speed (1.5x if sped up)
    const currentSpeed = gameDataRef.current.pipeSpeed * (gameDataRef.current.isSpedUp ? 1.5 : 1)

    // Update
    if (gameDataRef.current.gameState === 'playing' && !gameDataRef.current.quizActive && !gameDataRef.current.countdownActive) {
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
        cloud.x -= cloud.speed * (gameDataRef.current.isSpedUp ? 1.5 : 1)
        if (cloud.x + cloud.width < 0) {
          cloud.x = 400
        }
      })
      background.ground -= currentSpeed
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
        pipe.x -= currentSpeed

        // Check if passed
        if (!pipe.passed && bird.x > pipe.x + gameDataRef.current.pipeWidth) {
          pipe.passed = true
          setScore((s) => s + 1)
          // Play pass point sound
          if (audioRefs.current.passPoint) {
            audioRefs.current.passPoint.currentTime = 0
            audioRefs.current.passPoint.play().catch(() => {})
          }
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

    if (gameDataRef.current.gameState === 'playing' && !gameDataRef.current.quizActive && !gameDataRef.current.countdownActive) {
      gameDataRef.current.animationId = requestAnimationFrame(gameLoop)
    }
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      const newCategories = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]

      // Save to localStorage
      localStorage.setItem('selectedCategories', JSON.stringify(newCategories))
      return newCategories
    })
  }

  const selectAllCategories = () => {
    setSelectedCategories(categories)
    localStorage.setItem('selectedCategories', JSON.stringify(categories))
  }

  const deselectAllCategories = () => {
    setSelectedCategories([])
    localStorage.setItem('selectedCategories', JSON.stringify([]))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameDataRef.current.gameState === 'playing' && !gameDataRef.current.quizActive && !gameDataRef.current.countdownActive) {
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
        onClick={!isTouchDevice ? handleFlap : undefined}
        onTouchStart={isTouchDevice ? (e) => {
          e.preventDefault()
          e.stopPropagation()
          handleFlap()
        } : undefined}
        onTouchEnd={isTouchDevice ? (e) => {
          e.preventDefault()
          e.stopPropagation()
        } : undefined}
        onTouchMove={isTouchDevice ? (e) => {
          e.preventDefault()
        } : undefined}
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
          <button className="button" onClick={() => setSettingsOpen(true)}>
            Settings
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

      {quizActive && currentQuestion && (
        <div className="quizOverlay">
          <div className="quizContainer">
            <div className="quizCategory">{currentQuestion.category}</div>
            <h2 className="quizQuestion">{currentQuestion.question}</h2>
            <div className="quizOptions">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  className={`quizOption ${
                    selectedAnswer !== null
                      ? index === currentQuestion.correct_option_index
                        ? 'correct'
                        : index === selectedAnswer
                        ? 'incorrect'
                        : ''
                      : ''
                  }`}
                  onClick={() => !showExplanation && handleQuizAnswer(index)}
                  disabled={showExplanation}
                >
                  {option}
                </button>
              ))}
            </div>
            {showExplanation && (
              <div className="quizExplanation">
                <p className={selectedAnswer === currentQuestion.correct_option_index ? 'correct' : 'incorrect'}>
                  {selectedAnswer === currentQuestion.correct_option_index ? '✓ Correct!' : '✗ Incorrect'}
                </p>
                <p>{currentQuestion.explanation}</p>
                <button
                  className="button"
                  onClick={() => resumeGame(selectedAnswer === currentQuestion.correct_option_index)}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {countdown !== null && countdown > 0 && (
        <div className="countdownOverlay">
          <div className="countdownNumber">{countdown}</div>
        </div>
      )}

      {isSpedUp && gameState === 'playing' && (
        <div className="speedBanner">
          ⚡ SPED UP! ⚡
        </div>
      )}

      {settingsOpen && (
        <div className="quizOverlay">
          <div className="settingsContainer">
            <h2>Settings</h2>
            <p>Select question categories:</p>

            <div className="settingsButtons">
              <button className="button" onClick={selectAllCategories}>
                Select All
              </button>
              <button className="button" onClick={deselectAllCategories}>
                Deselect All
              </button>
            </div>

            <div className="categoryList">
              {categories.map(category => (
                <label key={category} className="categoryItem">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>

            <div className="settingsFooter">
              <p className="selectedCount">
                {selectedCategories.length} of {categories.length} categories selected
              </p>
              <button className="button" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
