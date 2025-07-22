const questions = [
  "Does it live in water?",
  "Is it a mammal?",
  "Does it fly?",
  "Is it bigger than a cat?",
  "Is it a pet?",
  "Is it dangerous?",
  "Does it have fur?",
  "Is it a farm animal?",
  "Can it be trained?"
];

let questionIndices = [];
let currentAnswers = [];
let currentQuestion = 0;
let data = [];
let labels = [];
let totalLabels = 0;

const questionEl = document.getElementById("question");
const resultEl = document.getElementById("result");
const learnBox = document.getElementById("learn-box");

function shuffleQuestions() {
  questionIndices = [...Array(questions.length).keys()].sort(() => Math.random() - 0.5);
}

function handleAnswer(ans) {
  if (currentQuestion >= questionIndices.length) return;

  currentAnswers.push(ans);
  currentQuestion++;

  if (currentQuestion < questionIndices.length) {
    questionEl.textContent = questions[questionIndices[currentQuestion]];
  } else {
    predict();
  }
}

async function predict() {
  disableButtons();

  if (!model) await createModel(questions.length, totalLabels || 1);
  if (data.length > 0) await trainModel(data, labels, totalLabels);

  if (data.length === 0) {
    resultEl.textContent = "🤔 I don’t know yet.";
    learnBox.style.display = "block";
    return;
  }

  const inputVector = Array(questions.length).fill(0);
  for (let i = 0; i < currentAnswers.length; i++) {
    inputVector[questionIndices[i]] = currentAnswers[i];
  }

  const guess = await predictAnswer(inputVector);
  resultEl.textContent = `🧠 I'm guessing: ${guess}`;
  learnBox.style.display = "block";
}

async function learn() {
  const value = document.getElementById("actual").value.trim();
  if (!value) return;

  if (!(value in labelMap)) {
    labelMap[value] = totalLabels;
    reverseMap[totalLabels] = value;
    totalLabels++;
  }

  const answerVector = Array(questions.length).fill(0);
  for (let i = 0; i < currentAnswers.length; i++) {
    answerVector[questionIndices[i]] = currentAnswers[i];
  }

  data.push(answerVector);
  labels.push(labelMap[value]);

  localStorage.setItem("ml_data", JSON.stringify({ data, labels, labelMap, reverseMap }));

  const db = window.firebaseDB;
  const { addDoc, collection } = window.firebaseFns;
  await addDoc(collection(db, "mindreader"), {
    name: value,
    vector: answerVector,
    label: labelMap[value]
  });

  resultEl.textContent = "✅ Thanks! I'll remember that.";
  learnBox.style.display = "none";
  reset();
}

function reset() {
  shuffleQuestions();
  currentAnswers = [];
  currentQuestion = 0;
  enableButtons();
  questionEl.textContent = questions[questionIndices[0]];
  document.getElementById("actual").value = '';
}

function disableButtons() {
  document.querySelectorAll("button").forEach(btn => {
    if (btn.innerText === "Yes" || btn.innerText === "No") btn.disabled = true;
  });
}

function enableButtons() {
  document.querySelectorAll("button").forEach(btn => {
    btn.disabled = false;
  });
}

function toggleDarkMode() {
  document.body.classList.toggle('dark');
}

window.onload = function () {
  const saved = JSON.parse(localStorage.getItem("ml_data"));
  if (saved) {
    data = saved.data || [];
    labels = saved.labels || [];
    labelMap = saved.labelMap || {};
    reverseMap = saved.reverseMap || [];
    totalLabels = reverseMap.length;
  }

  reset();

  // Firebase load
  setTimeout(async () => {
    const db = window.firebaseDB;
    const { collection, getDocs } = window.firebaseFns;
    const snapshot = await getDocs(collection(db, "mindreader"));
    snapshot.forEach(doc => {
      const d = doc.data();
      data.push(d.vector);
      labels.push(d.label);
      if (!(d.name in labelMap)) {
        labelMap[d.name] = totalLabels;
        reverseMap[totalLabels] = d.name;
        totalLabels++;
      }
    });
  }, 1000);
};

// Voice input
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.interimResults = false;

recognition.onresult = function (event) {
  const result = event.results[0][0].transcript.toLowerCase().trim();
  if (result.includes("yes")) handleAnswer(1);
  else if (result.includes("no")) handleAnswer(0);
};

recognition.onerror = function (event) {
  console.warn("Voice recognition error:", event.error);
};

document.body.addEventListener('keydown', (e) => {
  if (e.key === 'v') recognition.start();
});
function startListening() {
  try {
    recognition.start();
  } catch (err) {
    console.warn("Voice recognition already started");
  }
}
