let currentIndex = 0;
let score = 0;
let answeredCount = 0;
let answered = false;
let audioCtx = null;
let activeGains = [];

const SOUND_ENABLED = true;

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function stopActiveTones() {
  activeGains.forEach(g => {
    try { g.gain.cancelScheduledValues(audioCtx.currentTime); g.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.01); } catch (e) {}
  });
  activeGains = [];
}

const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const infoScreen = document.getElementById("info-screen");

const questionCard = document.getElementById("question-card");
const questionText = document.getElementById("question-text");
const answersList = document.getElementById("answers-list");
const explanationEl = document.getElementById("explanation");
const nextBtn = document.getElementById("next-btn");
const scoreDisplay = document.getElementById("score-display");
const progressDisplay = document.getElementById("progress-display");
const progressFill = document.getElementById("progress-fill");
const finalScore = document.getElementById("final-score");
const confettiLayer = document.getElementById("confetti-layer");
const infoDynamic = document.getElementById("info-dynamic");

const startBtn = document.getElementById("start-btn");
const closeInfoBtn = document.getElementById("close-info-btn");
const infoFromStartBtn = document.getElementById("info-from-start-btn");

const CONFETTI_COLORS = ["#FF4D6D", "#FFC53D", "#3DDC97", "#7C5CFF", "#00D9C0"];

const SLIDE_OUT_MS = 250;
const SLIDE_IN_MS = 300;
let transitioning = false;

function playCorrectChime() {
  if (!SOUND_ENABLED) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    stopActiveTones();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc2.type = "sine";
      osc.frequency.value = freq;
      osc2.frequency.value = freq * 2;
      const start = now + i * 0.1;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc2.start(start);
      osc.stop(start + 0.3);
      osc2.stop(start + 0.3);
      activeGains.push(gain);
    });
  } catch (e) {}
}

function playIncorrectBuzz() {
  if (!SOUND_ENABLED) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    stopActiveTones();
    const now = ctx.currentTime;
    const notes = [200, 150];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      const start = now + i * 0.11;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
      activeGains.push(gain);
    });
  } catch (e) {}
}

function startQuiz() {
  startScreen.classList.add("hidden");
  quizScreen.classList.remove("hidden");
  currentIndex = 0;
  score = 0;
  answeredCount = 0;
  scoreDisplay.textContent = `0/${QUESTIONS.length}`;
  loadQuestion();
}

function loadQuestion() {
  answered = false;
  explanationEl.classList.add("hidden");
  explanationEl.textContent = "";
  nextBtn.classList.add("hidden");

  const q = QUESTIONS[currentIndex];
  questionText.textContent = q.question;
  progressDisplay.textContent = `שאלה ${currentIndex + 1} מתוך ${QUESTIONS.length}`;
  progressFill.style.width = `${Math.round((currentIndex / QUESTIONS.length) * 100)}%`;

  answersList.innerHTML = "";
  q.answers.forEach((answerText, i) => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = answerText;
    btn.addEventListener("click", () => selectAnswer(i));
    answersList.appendChild(btn);
  });
}

function selectAnswer(selectedIndex) {
  if (answered) return;
  answered = true;

  const q = QUESTIONS[currentIndex];
  const buttons = answersList.querySelectorAll(".answer-btn");
  const correct = selectedIndex === q.correctIndex;

  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correctIndex) {
      btn.classList.add("correct");
    } else if (i === selectedIndex) {
      btn.classList.add("incorrect");
    }
  });

  answeredCount++;
  scoreDisplay.textContent = `${answeredCount}/${QUESTIONS.length}`;

  if (correct) {
    score++;
    playCorrectChime();
  } else {
    playIncorrectBuzz();
  }

  progressFill.style.width = `${Math.round(((currentIndex + 1) / QUESTIONS.length) * 100)}%`;
  explanationEl.textContent = q.explanation;
  explanationEl.classList.remove("hidden");
  nextBtn.classList.remove("hidden");
  nextBtn.textContent = currentIndex === QUESTIONS.length - 1 ? "סיום" : "השאלה הבאה";
}

function nextQuestion() {
  if (transitioning) return;
  transitioning = true;
  questionCard.classList.add("slide-out");

  setTimeout(() => {
    currentIndex++;
    questionCard.classList.remove("slide-out");

    if (currentIndex >= QUESTIONS.length) {
      transitioning = false;
      showInfoScreen(true);
      return;
    }

    questionCard.classList.add("slide-pending");
    loadQuestion();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        questionCard.classList.remove("slide-pending");
      });
    });

    setTimeout(() => {
      transitioning = false;
    }, SLIDE_IN_MS);
  }, SLIDE_OUT_MS);
}

function showInfoScreen(fromFinish) {
  startScreen.classList.add("hidden");
  quizScreen.classList.add("hidden");
  infoScreen.classList.remove("hidden");

  if (fromFinish) {
    finalScore.textContent = `${score}/${QUESTIONS.length}`;
    finalScore.classList.remove("hidden");
    spawnConfetti();
  } else {
    finalScore.classList.add("hidden");
    confettiLayer.innerHTML = "";
  }
}

function spawnConfetti() {
  confettiLayer.innerHTML = "";
  for (let i = 0; i < 26; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.round(Math.random() * 96)}%`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDuration = `${(1.8 + Math.random() * 1.4).toFixed(2)}s`;
    piece.style.animationDelay = `${(Math.random() * 1.6).toFixed(2)}s`;
    confettiLayer.appendChild(piece);
  }
}

function closeInfo() {
  infoScreen.classList.add("hidden");
  quizScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
  confettiLayer.innerHTML = "";
}

function renderInfoContent() {
  if (!infoDynamic) return;

  INFO_TOPICS.forEach(topic => {
    const heading = document.createElement("h3");
    heading.className = "info-heading";
    heading.textContent = topic.title;
    infoDynamic.appendChild(heading);

    const block = document.createElement("div");
    block.className = "info-block";

    const gallery = document.createElement("div");
    gallery.className = "info-gallery";
    topic.images.forEach(src => {
      const img = document.createElement("img");
      img.src = encodeURI(src);
      img.alt = topic.title;
      gallery.appendChild(img);
    });
    block.appendChild(gallery);

    topic.paragraphs.forEach(paragraphText => {
      const text = document.createElement("p");
      text.className = "info-text";
      text.textContent = paragraphText;
      block.appendChild(text);
    });

    infoDynamic.appendChild(block);
  });

  const commandersHeading = document.createElement("h2");
  commandersHeading.className = "section-heading";
  commandersHeading.textContent = COMMANDERS_TITLE;
  infoDynamic.appendChild(commandersHeading);

  const grid = document.createElement("div");
  grid.className = "commanders-grid";

  COMMANDERS.forEach(person => {
    const card = document.createElement("div");
    card.className = "commander-card";

    const photo = document.createElement("div");
    photo.className = "commander-photo";
    const photoImg = document.createElement("img");
    photoImg.src = encodeURI(person.image);
    photoImg.alt = person.name;
    photo.appendChild(photoImg);
    card.appendChild(photo);

    const name = document.createElement("h4");
    name.className = "commander-name";
    name.textContent = person.name;
    card.appendChild(name);

    const role = document.createElement("p");
    role.className = "commander-role";
    role.textContent = person.role;
    card.appendChild(role);

    grid.appendChild(card);
  });

  infoDynamic.appendChild(grid);
}

startBtn.addEventListener("click", startQuiz);
nextBtn.addEventListener("click", nextQuestion);
closeInfoBtn.addEventListener("click", closeInfo);
infoFromStartBtn.addEventListener("click", () => showInfoScreen(false));

renderInfoContent();
