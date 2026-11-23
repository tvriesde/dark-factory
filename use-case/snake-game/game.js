(() => {
  "use strict";

  const SIZE = 20;
  const TICK_MS = 145;
  const board = document.querySelector("#board");
  const scoreOutput = document.querySelector("#score");
  const statusText = document.querySelector("#game-status");
  const actionButton = document.querySelector("#action-button");
  const actionLabel = document.querySelector("#action-label");
  const actionIcon = document.querySelector("#action-icon");
  const pauseButton = document.querySelector("#pause-button");
  const cells = [];

  const vectors = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const opposite = { up: "down", down: "up", left: "right", right: "left" };

  let state = "ready";
  let snake = [];
  let food = null;
  let direction = "right";
  let nextDirection = "right";
  let score = 0;
  let timer = null;

  for (let i = 0; i < SIZE * SIZE; i += 1) {
    const cell = document.createElement("span");
    cell.className = "cell";
    cell.setAttribute("aria-hidden", "true");
    board.append(cell);
    cells.push(cell);
  }

  function randomFood() {
    const open = [];
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        if (!snake.some((segment) => segment.x === x && segment.y === y)) {
          open.push({ x, y });
        }
      }
    }
    if (open.length === 0) return null;
    return open[Math.floor(Math.random() * open.length)];
  }

  function setStatus(message) {
    statusText.textContent = message;
  }

  function render() {
    for (const cell of cells) cell.className = "cell";
    for (const segment of snake) {
      const cell = cells[segment.y * SIZE + segment.x];
      if (cell) cell.classList.add("snake");
    }
    if (snake[0]) cells[snake[0].y * SIZE + snake[0].x].classList.add("head");
    if (food) cells[food.y * SIZE + food.x].classList.add("food");
    scoreOutput.value = String(score).padStart(2, "0");
    scoreOutput.textContent = String(score).padStart(2, "0");

    const stateDescriptions = {
      ready: "Ready to play.",
      running: "Game in progress.",
      paused: "Game paused.",
      gameover: "Game over."
    };
    board.setAttribute("aria-label", `Snake game board. ${stateDescriptions[state]} Score ${score}.`);

    if (state === "ready") {
      actionLabel.textContent = "Start game";
      actionIcon.textContent = "↗";
      pauseButton.disabled = true;
      pauseButton.textContent = "Pause";
    } else if (state === "paused") {
      actionLabel.textContent = "Resume game";
      actionIcon.textContent = "↗";
      pauseButton.disabled = false;
      pauseButton.textContent = "Resume";
    } else if (state === "gameover") {
      actionLabel.textContent = "Play again";
      actionIcon.textContent = "↗";
      pauseButton.disabled = true;
      pauseButton.textContent = "Pause";
    } else {
      actionLabel.textContent = "Restart";
      actionIcon.textContent = "↻";
      pauseButton.disabled = false;
      pauseButton.textContent = "Pause";
    }
  }

  function reset() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    state = "ready";
    score = 0;
    direction = "right";
    nextDirection = "right";
    snake = [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 }
    ];
    food = randomFood();
    render();
    setStatus("Ready when you are. Use the arrows to guide your snake.");
  }

  function begin() {
    if (state === "paused") {
      state = "running";
      timer = window.setInterval(tick, TICK_MS);
      render();
      setStatus("Back in the game.");
      return;
    }
    reset();
    state = "running";
    timer = window.setInterval(tick, TICK_MS);
    render();
    setStatus("Game on. Collect a dot and keep moving.");
  }

  function pause() {
    if (state === "running") {
      window.clearInterval(timer);
      timer = null;
      state = "paused";
      render();
      setStatus("Game paused. Resume when you’re ready.");
    } else if (state === "paused") {
      begin();
    }
  }

  function finish(message) {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    state = "gameover";
    render();
    setStatus(message);
  }

  function tick() {
    direction = nextDirection;
    const vector = vectors[direction];
    const head = { x: snake[0].x + vector.x, y: snake[0].y + vector.y };
    const foundFood = food && head.x === food.x && head.y === food.y;
    const bodyToCheck = foundFood ? snake : snake.slice(0, -1);

    if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE) {
      finish(`Game over. Final score: ${score}.`);
      return;
    }
    if (bodyToCheck.some((segment) => segment.x === head.x && segment.y === head.y)) {
      finish(`Game over. Final score: ${score}.`);
      return;
    }

    snake.unshift(head);
    if (foundFood) {
      score += 1;
      food = randomFood();
      if (food === null) {
        render();
        finish(`Board cleared! Final score: ${score}.`);
        return;
      }
      render();
      setStatus(`Dot collected. Score ${score}.`);
    } else {
      snake.pop();
      render();
    }
  }

  function requestDirection(requested) {
    if (state !== "running" || !vectors[requested]) return;
    if (snake.length > 1 && opposite[direction] === requested) return;
    nextDirection = requested;
  }

  function isInteractiveTarget(target) {
    return target instanceof Element && Boolean(target.closest(
      "button, a, input, select, textarea, [contenteditable='true'], [role='button']"
    ));
  }

  function isArrowNavigationTarget(target) {
    return target instanceof Element && Boolean(target.closest(
      "a, input, select, textarea, [contenteditable]:not([contenteditable='false']), [role='textbox']"
    ));
  }

  actionButton.addEventListener("click", () => {
    if (state === "running") {
      reset();
      setStatus("Game reset. Press Start game when you’re ready.");
    } else {
      begin();
    }
  });
  pauseButton.addEventListener("click", pause);
  document.querySelectorAll("[data-direction]").forEach((button) => {
    button.addEventListener("click", () => requestDirection(button.dataset.direction));
  });

  document.addEventListener("keydown", (event) => {
    const keys = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right"
    };
    if (keys[event.key]) {
      if (state === "running" && !isArrowNavigationTarget(event.target)) {
        event.preventDefault();
        requestDirection(keys[event.key]);
      }
    } else if ((event.key === " " || event.key === "Escape") && (state === "running" || state === "paused")) {
      if (isInteractiveTarget(event.target)) return;
      event.preventDefault();
      pause();
    }
  });

  reset();
})();
