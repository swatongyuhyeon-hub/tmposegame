/**
 * main.js
 * 포즈 인식과 게임 로직을 초기화하고 서로 연결하는 진입점
 */

// 전역 변수
let poseEngine;
let gameEngine;
let stabilizer;
let ctx;
let labelContainer;

/**
 * 애플리케이션 초기화
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  startBtn.disabled = true;

  try {
    // 1. PoseEngine 초기화
    poseEngine = new PoseEngine("./my_model/");
    const { maxPredictions, webcam } = await poseEngine.init({
      size: 400, // 캔버스 크기 키움
      flip: true
    });

    // 2. Stabilizer 초기화
    stabilizer = new PredictionStabilizer({
      threshold: 0.8, // 임계값 높임
      smoothingFrames: 5 // 부드럽게
    });

    // 3. 캔버스 설정
    const canvas = document.getElementById("canvas");
    canvas.width = 400;
    canvas.height = 400;
    ctx = canvas.getContext("2d");

    // 4. GameEngine 초기화 및 연결
    gameEngine = new GameEngine();
    gameEngine.init(canvas); // Canvas 전달

    // 5. Label Container 설정
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }

    // 6. PoseEngine 콜백
    poseEngine.setPredictionCallback(handlePrediction);
    // Draw loop is handled by PoseEngine's internal loop calling this:
    poseEngine.setDrawCallback(drawLoop);

    // 7. 시작
    poseEngine.start();
    startGameMode(); // 게임 바로 시작 또는 버튼 분리 가능

    stopBtn.disabled = false;
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("초기화 실패 (콘솔 확인 필요)");
    startBtn.disabled = false;
  }
}

function stop() {
  if (poseEngine) poseEngine.stop();
  if (gameEngine) gameEngine.stop();
  if (stabilizer) stabilizer.reset();

  document.getElementById("startBtn").disabled = false;
  document.getElementById("stopBtn").disabled = true;
}

/**
 * 예측 처리 (매 프레임 호출됨)
 */
function handlePrediction(predictions, pose) {
  // 안정화
  const stabilized = stabilizer.stabilize(predictions);

  // 디버그 레이블
  for (let i = 0; i < predictions.length; i++) {
    const classDesc = predictions[i].className + ": " + predictions[i].probability.toFixed(2);
    labelContainer.childNodes[i].innerHTML = classDesc;
  }

  // 메인 예측 표시
  const maxDiv = document.getElementById("max-prediction");
  if (stabilized.className) {
    maxDiv.innerText = stabilized.className;
    // 게임 엔진에 전달
    if (gameEngine && gameEngine.isGameActive) {
      gameEngine.onPoseDetected(stabilized.className);
    }
  } else {
    maxDiv.innerText = "...";
  }
}

/**
 * 그리기 루프 (PoseEngine에서 매 프레임 호출)
 */
function drawLoop(pose) {
  // 1. 웹캠 그리기 background
  if (poseEngine.webcam && poseEngine.webcam.canvas) {
    ctx.drawImage(poseEngine.webcam.canvas, 0, 0, 400, 400);
  }

  // 2. 포즈 스켈레톤 그리기 (선택)
  if (pose) {
    const minConf = 0.5;
    tmPose.drawKeypoints(pose.keypoints, minConf, ctx);
    tmPose.drawSkeleton(pose.keypoints, minConf, ctx);
  }

  // 3. 게임 오버레이 그리기
  if (gameEngine && gameEngine.isGameActive) {
    gameEngine.draw(); // 게임 요소(바구니, 과일) 그리기
  }
}

function startGameMode() {
  if (!gameEngine) return;
  gameEngine.start({ timeLimit: 60 });
}
