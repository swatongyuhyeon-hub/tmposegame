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

    // 3. 캔버스 설정 (게임용)
    const canvas = document.getElementById("canvas");
    canvas.width = 600;
    canvas.height = 600;
    ctx = canvas.getContext("2d");

    // 4. GameEngine 초기화 및 연결
    gameEngine = new GameEngine();
    gameEngine.init(canvas); // Canvas 전달

    // [Removed] Webcam Canvas Append (Hidden)

    // 6. Label Container 설정
    labelContainer = document.getElementById("label-container");
    // labelContainer.innerHTML = ""; // Hidden
    /*
    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }
    */

    // 7. PoseEngine 콜백
    poseEngine.setPredictionCallback(handlePrediction);
    // Draw loop is handled by PoseEngine's internal loop calling this:
    poseEngine.setDrawCallback(drawLoop);

    // 8. 시작
    poseEngine.start();
    startGameMode(); // 게임 바로 시작

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
    const classDesc = `<span>${predictions[i].className}</span>: <span>${(predictions[i].probability * 100).toFixed(0)}%</span>`;
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
  // 1. 웹캠 캔버스에 스켈레톤 그리기 (선택)
  // 웹캠 캔버스는 DOM에 따로 떨어져 있지만, 원한다면 여기서 그 위에 덧그릴 수 있습니다.
  if (poseEngine.webcam && poseEngine.webcam.canvas) {
    const webcamCtx = poseEngine.webcam.canvas.getContext('2d');
    // 웹캠 비디오는 TM 라이브러리가 자동으로 그림

    // 스켈레톤 그리기
    if (pose) {
      const minConf = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minConf, webcamCtx);
      tmPose.drawSkeleton(pose.keypoints, minConf, webcamCtx);
    }
  }

  // 2. 게임 캔버스 업데이트 (전용 캔버스)
  /*
  if (gameEngine && gameEngine.isGameActive) {
    gameEngine.draw();
  }
  */
}

function startGameMode() {
  if (!gameEngine) return;
  gameEngine.start({ timeLimit: 180 }); // 3분
}
