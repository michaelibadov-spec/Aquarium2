const canvas = document.getElementById("aquarium");
const ctx = canvas.getContext("2d");

// ---- BACKGROUND IMAGE ----
const bgImage = new Image();
bgImage.src = "images/back.jpg"; // ⬅️ change to .jpg if needed

// ---- DECORATION IMAGES ----
const rockImg = new Image();
rockImg.src = "images/decoration.png";

const seaweedImg = new Image();
seaweedImg.src = "images/decoration1.png";

const coralImg = new Image();
coralImg.src = "images/decoration2.png";


// ---- FISH IMAGES ----
const fishSources = [
  "images/redfish.png",
  "images/saladfish.png",
  "images/purplefish.png",
  "images/orangefish.png",
  "images/ghostfish.png",
  "images/bluefish.png"
];

const fishImages = [];
let fishes = [];
const NUM_FISH = 8;
let startTime = 0;
let assetsLoaded = false;


// ---- SCHOOL (GROUP) MODE ----
let schoolMode = false; // when true, all fish move toward target
let schoolTarget = { x: 0, y: 0 }; // where we are "calling" the fish

let isSchoolPressing = false;   // are we currently holding press
let longPressTimer = null;      // timer for 2s long press

// ---- TAP / RIPPLE STATE ----
let pressStartTime = 0;
let lastPressPos = null;
let longPressActivated = false;

// ---- FISH MESSAGE BUBBLES ----
// 5 texts per fish type (put your real sentences here)
const fishMessageMap = {
  redfish: [
    "怒りは「これはイヤだよ」と教えてくれる大切なサインだよ",
    "まずは一呼吸おくと、気持ちが少し落ち着くよ",
    "体を少し動かすと、怒りエネルギーが外に出やすいよ",
    "怒りの裏には「本当は悲しい」「不安」など別の気持ちがあることも多いよ",
    "すぐに決めず、少し時間をおくと後悔が減るよ"
  ],
  bluefish: [
    "悲しみは「大切に思っている」気持ちのうらがえしだよ",
    "泣くことは、心をリセットする自然な働きだよ",
    "あたたかい飲み物を飲むと、気持ちが少し落ち着くよ",
    "自分を責めすぎないでね。ゆっくり休む時間も大事だよ",
    "誰かに少し話すだけでも、心の重さが半分になることがあるよ"
  ],
  saladfish: [
    "嫌悪は「これは自分に合わないよ」というサインだよ",
    "距離をとることは、自分を守る大事な行動だよ",
    "無理に好きにならなくても大丈夫だよ",
    "安心できる場所に移動すると、気持ちが落ち着きやすいよ",
    "イヤな気持ちを短くメモすると、自分のパターンが見えてくるよ"
  ],
  purplefish: [
    "恐れは「危ないかも」と体が教えてくれるサインだよ",
    "深呼吸をゆっくりすると、心の緊張が少しゆるむよ",
    "不安な気持ちは、だれにでも起こる自然な反応だよ",
    "今できる小さな行動を一つ決めると、気持ちが軽くなるよ",
    "怖い気持ちを言葉にすると、心の中が整理されやすいよ"
  ],
  orangefish: [
    "喜びは、心が「今、いいね！」と感じているサインだよ",
    "うれしい気持ちを言葉にすると、もっと広がっていくよ",
    "小さな幸せでも気づくことが大事だよ",
    "喜びの瞬間をメモすると、あとで元気をくれるよ",
    "誰かと共有すると、喜びは2倍になるよ"
  ],
  ghostfish: [
    "平静は、心と体が「ちょうどいい状態」にいるサインだよ",
    "落ち着いた時間は、心を回復させる大事な栄養だよ",
    "静かな音ややさしい光は、平静を守りやすいよ",
    "深い呼吸を続けると、この状態が長く続きやすいよ",
    "平静のときに決めたことは、たいてい良い選択になるよ"
  ]
};

// active bubble data: which fish, what text, how long
let activeBubble = null; // { fish, text, createdAt, duration }

// detect fish “type” from its image src
function getFishType(fish) {
  const src = fish.img && fish.img.src ? fish.img.src : "";
  if (src.includes("redfish")) return "redfish";
  if (src.includes("bluefish")) return "bluefish";
  if (src.includes("saladfish")) return "saladfish";
  if (src.includes("purplefish")) return "purplefish";
  if (src.includes("orangefish")) return "orangefish";
  if (src.includes("ghostfish")) return "ghostfish";
  return null;
}

function showBubbleForFish(fish) {
  const type = getFishType(fish);
  if (!type) return;
  const messages = fishMessageMap[type];
  if (!messages || messages.length === 0) return;

  const text = messages[Math.floor(Math.random() * messages.length)];

  activeBubble = {
    fish,
    text,
    createdAt: performance.now(),
    duration: 3000 // ms (3 seconds)
  };
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Automatically wrap Japanese text so bubble doesn't go outside screen
function wrapBubbleText(ctx, text, maxWidth) {
  // keep manual line breaks if you add "\n"
  const rawLines = text.split("\n");
  const lines = [];

  for (const raw of rawLines) {
    let current = "";

    for (const ch of raw) {
      const test = current + ch;
      if (ctx.measureText(test).width > maxWidth && current !== "") {
        lines.push(current);
        current = ch; // start new line with this char
      } else {
        current = test;
      }
    }

    if (current) lines.push(current);
  }

  return lines;
}


function drawBubble() {
  if (!activeBubble) return;

  const now = performance.now();
  if (now - activeBubble.createdAt > activeBubble.duration) {
    activeBubble = null;
    return;
  }

  const fish = activeBubble.fish;
  const text = activeBubble.text;

  ctx.save();
  ctx.font = "14px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // 🔹 Max bubble width: 60% of canvas width
  const maxBubbleWidth = canvas.width * 0.6;

  // 🔹 Auto-wrap text into multiple lines
  const lines = wrapBubbleText(ctx, text, maxBubbleWidth);

  const padding = 8;
  const lineHeight = 18;

  let maxWidth = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  }

  const boxWidth = maxWidth + padding * 2;
  const boxHeight = lines.length * lineHeight + padding * 2;

  // 🔹 Position ABOVE the fish, using live fish.x / fish.y → follows fish
  let x = fish.x - boxWidth / 2;
  let y = fish.y - fish.height - boxHeight * 0.3;

  // 🔹 Keep bubble fully inside canvas
  if (x < 10) x = 10;
  if (x + boxWidth > canvas.width - 10) {
    x = canvas.width - boxWidth - 10;
  }
  if (y < 10) y = 10;

  // White rounded box
  ctx.fillStyle = "white";
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, x, y, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.stroke();

  // 🔹 Tail pointing to fish (clamped to bubble width so it stays pretty)
  let tailX = fish.x;
  const tailY = y + boxHeight;

  if (tailX < x + 8) tailX = x + 8;
  if (tailX > x + boxWidth - 8) tailX = x + boxWidth - 8;

  ctx.beginPath();
  ctx.moveTo(tailX - 8, tailY);
  ctx.lineTo(tailX, tailY + 10);
  ctx.lineTo(tailX + 8, tailY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Text lines
  ctx.fillStyle = "#333";
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x + padding, y + padding + i * lineHeight);
  }

  ctx.restore();
}


// ---- WATER RIPPLES ----
const ripples = [];

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (e.touches && e.touches[0]) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}


// When bg loads, then fish, then start
bgImage.onload = () => {
  loadFishImages(() => {
    assetsLoaded = true;
    setupCanvasSize();
    initFish();
    startTime = performance.now();
    requestAnimationFrame(loop);
  });
};

// If window size changes, we only adjust phone-frame via CSS, no need to change canvas
window.addEventListener("resize", () => {
  // do nothing special for now
});

// Set canvas size so that:
//   - height = phone-frame height (700px)
//   - width = scaled image width
function setupCanvasSize() {
  const phoneFrame = document.getElementById("phone-frame");
  const frameHeight = phoneFrame.clientHeight; // 700px
  const imgW = bgImage.naturalWidth;          // 1836
  const imgH = bgImage.naturalHeight;         // 2556

  // scale so image height = frame height
  const scale = frameHeight / imgH;
  const scaledW = imgW * scale;
  const scaledH = frameHeight;

  canvas.width = scaledW;
  canvas.height = scaledH;

  // also set CSS so scroll-container knows real size
  canvas.style.width = scaledW + "px";
  canvas.style.height = scaledH + "px";
   // 🔹 NEW: center the scroll on the middle of the aquarium
  const scrollContainer = document.getElementById("scroll-container");
  if (scrollContainer) {
    const viewW = scrollContainer.clientWidth;
    const centerScroll = (canvas.width - viewW) / 2;
    scrollContainer.scrollLeft = Math.max(0, centerScroll);
  }
}

function spreadFloatFishAfterSchool() {
  // find all red + purple (movementType === "float")
  const floatFish = fishes.filter((f) => f.movementType === "float");
  if (floatFish.length === 0) return;

  // use schoolTarget as center if available, otherwise center of screen
  const centerX = schoolTarget?.x ?? canvas.width / 2;
  const centerY = schoolTarget?.y ?? canvas.height / 2;

  const n = floatFish.length;
  const baseRadius = canvas.width * 0.08; // how far they separate (tweak if needed)

  for (let i = 0; i < n; i++) {
    const fish = floatFish[i];

    // distribute roughly in a circle
    const angle = (i / n) * Math.PI * 2;
    const dist = baseRadius * (0.7 + Math.random() * 0.6); // slight randomness

    let newX = centerX + Math.cos(angle) * dist;
    let newY = centerY + Math.sin(angle) * dist;

    // keep inside canvas
    const marginX = fish.width / 2;
    const marginY = fish.height / 2;

    if (newX < marginX) newX = marginX;
    if (newX > canvas.width - marginX) newX = canvas.width - marginX;
    if (newY < marginY) newY = marginY;
    if (newY > canvas.height - marginY) newY = canvas.height - marginY;

    // update both base and actual position so movement continues naturally
    fish.baseX = newX;
    fish.baseY = newY;
    fish.x = newX;
    fish.y = newY;
  }
}

// Load all fish images
function loadFishImages(onAllLoaded) {
  let loadedCount = 0;

  fishSources.forEach((src, index) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      loadedCount++;
      if (loadedCount === fishSources.length) {
        onAllLoaded();
      }
    };
    fishImages[index] = img;
  });
}

// ---- FISH CLASS ----
class Fish {
  constructor() {
    // pick random fish image
    const randomIndex = Math.floor(Math.random() * fishImages.length);
    this.img = fishImages[randomIndex];
        // ---- CLICK ANIMATION (init) ----
    this.isAnimating = false;
    this.animImage = null;
    this.animFrames = 0;
    this.animFrameIndex = 0;
    this.animFrameWidth = 0;
    this.animFrameHeight = 0;
    this.animFPS = 12;
    this.animTimer = 0;
    this.lastAnimTime = 0;
    // ---- animation loop settings ----
    this.loopCount = 0;
    this.maxLoops = 2;   // play animation twice


    // choose spritesheet by fish type
    if (this.img.src.includes("redfish")) {
      this.animImage = new Image();
      this.animImage.src = "images/redfish_anim.png";  // your redfish sheet
      this.animFrames = 8; // ← change to real frame count
      this.animFrameWidth = 1000;    // ✅ each frame 256×256
      this.animFrameHeight = 1000;
    } else if (this.img.src.includes("bluefish")) {
      this.animImage = new Image();
      this.animImage.src = "images/bluefish_anim.png"; // your bluefish sheet
      this.animFrames = 8; // ← change if different
      this.animFrameWidth = 1000;    // ✅ each frame 1000x1000
      this.animFrameHeight = 1000;

    }

this.forceX = 0;
this.forceY = 0;
this.forceTime = 0;  // how long the force effect lasts

    // movement type based on file name
    if (this.img.src.includes("bluefish")) {
      this.movementType = "blue";           // bluefish
    } else if (this.img.src.includes("ghostfish")) {
      this.movementType = "ghost";          // ghostfish
    } else if (this.img.src.includes("orangefish")) {
      this.movementType = "orange";         // orangefish
    } else if (this.img.src.includes("saladfish")) {
      this.movementType = "salad";          // saladfish
    } else if (
      this.img.src.includes("purplefish") ||
      this.img.src.includes("redfish")
    ) {
      this.movementType = "float";          // purple + red
    } else {
      this.movementType = "normal";
    }

    // keep aspect ratio, size relative to canvas height
    const aspect = this.img.naturalWidth / this.img.naturalHeight;
    const baseHeight = canvas.height * (0.12 + Math.random() * 0.04); // 12–16% of bg height
    this.height = baseHeight;
    this.width = baseHeight * aspect;

    // ---- PER-FISH SIZE FACTOR ----
let sizeFactor = 1; // 1 = normal size

if (this.img.src.includes("orangefish")) {
  sizeFactor = 1.38;      // big orange = normal
} else if (this.img.src.includes("bluefish")) {
  sizeFactor = 1.92;      // bluefish a bit bigger
} else if (this.img.src.includes("ghostfish")) {
  sizeFactor = 1.56;      // ghostfish slightly smaller
} else if (this.img.src.includes("purplefish")) {
  sizeFactor = 1.38;      // purplefish smaller
} else if (this.img.src.includes("redfish")) {
  sizeFactor = 1.86;      // redfish smaller
} else if (this.img.src.includes("saladfish")) {
  sizeFactor = 1.32;      // saladfish slightly larger
}

// apply the factor
this.height *= sizeFactor;
this.width  *= sizeFactor;


    // base position in the tank
    this.baseX = Math.random() * canvas.width;
    this.baseY =
      canvas.height * 0.25 + Math.random() * canvas.height * 0.5;

    // saladfish: remember and stay near bottom
    if (this.movementType === "salad") {
      this.bottomY = canvas.height * 0.85;
      this.baseY = this.bottomY;
    }

    // bluefish: slightly lower band
    if (this.movementType === "blue") {
      this.baseY = canvas.height * 0.7;
      this.baseX = canvas.width * 0.5;   // 🔹 center X
    }

// ---- ENTRY ANIMATION ----
if (this.movementType === "blue") {
  // bluefish start above screen
  this.entryStartY = -this.height - Math.random() * 200;
  this.entryOffsetX = (Math.random() - 0.5) * canvas.width * 0.08;
  this.entryDuration = 1500 + Math.random() * 1500;

  this.x = this.baseX + this.entryOffsetX;
  this.y = this.entryStartY;
} else {
  // all other fish start exactly at their base positions
  this.x = this.baseX;
  this.y = this.baseY;
}

// direction: 1 = right, -1 = left (can be overridden in initFish)
this.direction = Math.random() < 0.5 ? 1 : -1;

// base speed & sway
this.speed = 0.3 + Math.random() * 0.6;
    this.swayAmplitude =
      canvas.height * (0.02 + Math.random() * 0.02);
    this.swaySpeed = 0.001 + Math.random() * 0.0015;
    this.swayOffset = Math.random() * 1000;

    // tweaks per type
    if (this.movementType === "blue") {
      this.speed *= 0.8;                // bluefish slower
      this.pathSpeed = 0.00005;         // S-curve speed factor
      this.pathOffset = Math.random();  // start point along curve
      this.swayAmplitude *= 2.0;

      this.direction = -1; //always left
        this.entryBlendDuration = 1200; //blend from entry to full path
    } else if (this.movementType === "ghost") {
      this.speed *= 0.7;
    } else if (this.movementType === "salad") {
      this.speed *= 0.6;
    } else if (this.movementType === "float") {
      this.speed *= 0.5;
    }
        // extra randomization so red & purple don't move identically
    if (this.movementType === "float") {
      this.floatPhaseX = Math.random() * Math.PI * 2;
      this.floatPhaseY = Math.random() * Math.PI * 2;
      this.floatSpeedX = 0.00035 + Math.random() * 0.0003;
      this.floatSpeedY = 0.00045 + Math.random() * 0.0003;
    }

  }

    // ---- play click animation (called when fish is tapped) ----
  playClickAnimation() {
    if (!this.animImage || !this.animFrames) return;

    this.isAnimating = true;
    this.animFrameIndex = 0;
    this.animTimer = 0;
    this.lastAnimTime = 0;
    this.loopCount = 0; // reset loops at start


  }


  update(time) {
    const elapsed = time - startTime;
    const entryDuration = this.entryDuration || 2000;
       // for bluefish: smooth transition right after entry animation
  let blueBlend = 1;
  if (this.movementType === "blue" && this.entryBlendDuration) {
    const blendRaw = (elapsed - entryDuration) / this.entryBlendDuration;
    // clamp between 0..1 and ease a bit
    const clamped = Math.max(0, Math.min(1, blendRaw));
    blueBlend = clamped * clamped * (3 - 2 * clamped); // smoothstep
  }

  // ---- CLICK ANIMATION ACTIVE ----
  if (this.isAnimating) {
    // freeze normal movement while animating
    this.animTimer += time - (this.lastAnimTime || time);
    this.lastAnimTime = time;

    const frameDuration = 1000 / this.animFPS;

    if (this.animTimer >= frameDuration) {
      this.animTimer -= frameDuration;
      this.animFrameIndex++;

      // animation finished → loop frames
      if (this.animFrameIndex >= this.animFrames) {
        this.animFrameIndex = 0;      // go back to frame 0
        this.loopCount++;             // count one full loop

        if (this.loopCount >= this.maxLoops) {
          this.isAnimating = false;   // stop after N loops
        }
      }
    }

    return; // skip normal movement while animation is playing
  }


if (this.movementType === "blue" && elapsed < entryDuration) {
      // ENTRY: natural fall with easing + sideways drift into lane
      const progress = elapsed / entryDuration;
      // smoothstep easing: starts fast, slows near end
      const eased = progress * progress * (3 - 2 * progress);

      // vertical: from entryStartY down to baseY
      const startY =
        this.entryStartY !== undefined
          ? this.entryStartY
          : -this.height - 100;
      this.y = startY + (this.baseY - startY) * eased;


       // 👇 land around the vertical middle of the aquarium
  const targetY = canvas.height * 0.4;
  this.y = startY + (targetY - startY) * eased;


      // horizontal: from offset position into baseX
      const offsetX = this.entryOffsetX || 0;
      this.x = this.baseX + offsetX * (1 - eased);

      return; // still in entry, skip normal movement
    }

    const t = time + this.swayOffset;
    // ... rest of your movement code ...

      // If school mode is active: all fish move toward the pressed point
// ---- SCHOOL MODE: GATHER AROUND FINGER ----
// ---- SCHOOL MODE: GATHER AROUND FINGER ----
if (schoolMode) {
  const dx = schoolTarget.x - this.x;
  const dy = schoolTarget.y - this.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const stopDistance = this.width * 2.0; // how close they get to your finger

  if (dist > stopDistance) {
    // far away → move toward finger (slow)
    const moveFactor = 0.03;
    this.x += dx * moveFactor;
    this.y += dy * moveFactor;

    // also move "home position" toward finger (so no teleport later)
    this.baseX += (schoolTarget.x - this.baseX) * 0.02;
    this.baseY += (schoolTarget.y - this.baseY) * 0.02;
  } else {
    // already close → very small drift, so they don't pile exactly on top
    const moveFactor = 0.01;
    this.x += dx * moveFactor;
    this.y += dy * moveFactor;

    // gently pull base toward finger too
    this.baseX += (schoolTarget.x - this.baseX) * 0.01;
    this.baseY += (schoolTarget.y - this.baseY) * 0.01;
  }

  return;
}



    // -------------------------
    // BLUEFISH: S-CURVE PATH + DOOR WRAP
    // -------------------------
    if (this.movementType === "blue") {
      // 1) horizontal movement (same style as other fish)
       const speedFactor = blueBlend;              // 0 → 1
       this.x += this.speed * this.direction * blueBlend;

      const wrapMargin = this.width / 2;
      if (this.x > canvas.width + wrapMargin) {
        this.x = -wrapMargin;                 // door effect: right → left
      } else if (this.x < -wrapMargin) {
        this.x = canvas.width + wrapMargin;   // door effect: left → right
      }

      // 2) map x-position to 0..1 progress across screen
      const margin = wrapMargin;
      const totalWidth = canvas.width + margin * 2;
      let u = (this.x + margin) / totalWidth; // 0 (left) → 1 (right)

      // if direction is left, flip so path still goes bottom→top
      if (this.direction < 0) {
        u = 1 - u;
      }

// direction-aware diagonal:
// direction = +1  (right) → start high, go low
// direction = -1  (left)  → start low,  go high
let startY, endY;

if (this.direction > 0) {
  // moving RIGHT: top → bottom
  startY = canvas.height * 0.15;
  endY   = canvas.height * 0.85;
} else {
  // moving LEFT: bottom → top
  startY = canvas.height * 0.85;
  endY   = canvas.height * 0.15;
}

const baseY = startY + (endY - startY) * u;

      // 4) S-shaped offset along that diagonal
      const phase =
        (u - 0.5) * Math.PI * 2 + this.swayOffset * 0.005;
      const sOffset = Math.sin(phase) * this.swayAmplitude * 1.5;

      const targetY = baseY + sOffset;

      // 5) smooth vertical follow → no snapping
     const follow = 0.02 + 0.06 * blueBlend;  
     this.y += (targetY - this.y) * follow;
    // --- ripple push ---
    if (this.forceTime > 0) {
      const dt = 16;
      this.x += this.forceX;
      this.y += this.forceY;
      this.forceX *= 0.85;
      this.forceY *= 0.85;
      this.forceTime -= dt;
    }

      return; // bluefish done, skip common movement logic
    }


    // -------------------------
    // COMMON HORIZONTAL MOVEMENT + DOOR WRAP
    // (for all except bluefish)
    // -------------------------
    this.x += this.speed * this.direction;

    const wrapMargin = this.width / 2;
    if (this.x > canvas.width + wrapMargin) {
      this.x = -wrapMargin;
    } else if (this.x < -wrapMargin) {
      this.x = canvas.width + wrapMargin;
    }

    // -------------------------
    // VERTICAL / STYLE PER TYPE
    // -------------------------
    switch (this.movementType) {
      case "ghost": {
        // octopus: pulses up, slows, drifts slightly down
        const pulse = (Math.sin(t * 0.003) + 1) / 2; // 0..1
        const up = this.speed * 1.5 * pulse;
        const down = this.speed * 0.3 * (1 - pulse);

        this.y -= up;
        this.y += down;

        // small sideways wobble
        this.x += Math.sin(t * 0.002) * 0.3;

        // vertical door wrap top↔bottom
        if (this.y < -this.height / 2) {
          this.y = canvas.height + this.height / 2;
        } else if (this.y > canvas.height + this.height / 2) {
          this.y = -this.height / 2;
        }
         // --- ripple push ---
         if (this.forceTime > 0) {
          this.x += this.forceX;
          this.y += this.forceY;

          this.forceX *= 0.85;
          this.forceY *= 0.85;

          this.forceTime -= 16; // ~1 frame
         }
        break;
      }

      case "orange": {
        // orangefish: one direction, small zigzag vertically
        const sway =
          Math.sin(t * 0.003) * this.swayAmplitude * 0.5;
        this.y = this.baseY + sway;
                 // --- ripple push ---
         if (this.forceTime > 0) {
          this.x += this.forceX;
          this.y += this.forceY;

          this.forceX *= 0.85;
          this.forceY *= 0.85;

          this.forceTime -= 16; // ~1 frame
         }

        break;
      }

case "salad": {
  // after school mode, gently return baseY to bottom lane
  if (this.bottomY !== undefined) {
    const relaxSpeed = 0.01; // smaller = slower slide down
    this.baseY += (this.bottomY - this.baseY) * relaxSpeed;

    // snap when very close so it stops drifting
    if (Math.abs(this.baseY - this.bottomY) < 0.5) {
      this.baseY = this.bottomY;
    }
  }

  // saladfish: bottom, soft up/down
  const sway =
    Math.sin(t * 0.0025) * this.swayAmplitude * 0.3;
  this.y = this.baseY + sway;
           // --- ripple push ---
         if (this.forceTime > 0) {
          this.x += this.forceX;
          this.y += this.forceY;

          this.forceX *= 0.85;
          this.forceY *= 0.85;

          this.forceTime -= 16; // ~1 frame
         }

  break;
}

case "float": {
    const sway = Math.sin(t * this.swaySpeed) * this.swayAmplitude;

    // apply normal float movement
    this.y = this.baseY + sway;
    this.x += Math.sin(t * 0.001) * 0.3; // small horizontal wobble (optional)

    // --- strong ripple push for floating fish ---
    if (this.forceTime > 0) {
      // Make them react more
      this.x += this.forceX * 1.8;   // 80% stronger sideways
      this.y += this.forceY * 1.8;   // 80% stronger vertical

      this.forceX *= 0.92;  // slower decay = longer reaction
      this.forceY *= 0.92;
      this.forceTime -= 16;
    }

    break;
}

      default: {
        // normal fallback: gentle sway around baseY
        const sway =
          Math.sin(t * this.swaySpeed) * this.swayAmplitude;
        this.y = this.baseY + sway;
                 // --- ripple push ---
         if (this.forceTime > 0) {
          this.x += this.forceX;
          this.y += this.forceY;

          this.forceX *= 0.85;
          this.forceY *= 0.85;

          this.forceTime -= 16; // ~1 frame
         }

      }
    }

    // final clamp for vertical (for types that don't have vertical wrap)
    if (this.movementType !== "ghost") {
      const top = this.height / 2;
      const bottom = canvas.height - this.height / 2;
      if (this.y < top) this.y = top;
      if (this.y > bottom) this.y = bottom;
    }
  }

draw(ctx) {
  ctx.save();
  ctx.translate(this.x, this.y);

  // Only flip non-blue fish based on direction
  if (this.movementType !== "blue" && this.direction > 0) {
    ctx.scale(-1, 1);
  }

  // If you also rotate bluefish somewhere, keep that here, e.g.:
  // if (this.movementType === "blue") {
  //   ctx.rotate(45 * Math.PI / 180);
  // }

    // draw either animation frame or normal image
    if (this.isAnimating && this.animImage && this.animFrames > 0 && this.animFrameWidth > 0) {
      const sx = this.animFrameWidth * this.animFrameIndex;
      ctx.drawImage(
        this.animImage,
        sx,
        0,
        this.animFrameWidth,
        this.animFrameHeight,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    } else {
      ctx.drawImage(
        this.img,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    }

  ctx.restore();
}

}

// ---- INIT FISH ----
function initFish() {
  // clear old fish
  fishes = [];

  let bigOrange = null;
  let smallOrange = null;
  let red = null;
  let salad = null;
  let purple = null;
  let ghost = null;
  let blue = null;

  let safety = 0;

  // keep creating random fish until we got one of each we need
  while (
    (!bigOrange ||
      !smallOrange ||
      !red ||
      !salad ||
      !purple ||
      !ghost ||
      !blue) &&
    safety < 200
  ) {
    const f = new Fish();
    const src = f.img.src;

    if (src.includes("orangefish")) {
if (!bigOrange) {
  // FIRST orangefish = big one → face left, move left
  bigOrange = f;
  bigOrange.direction = -1;  // move left
} else if (!smallOrange) {
  // SECOND orangefish = small one → face right, move right
  f.width *= 0.7;
  f.height *= 0.7;
  f.direction = 1;           // move right
  smallOrange = f;
}


    } else if (src.includes("redfish") && !red) {
      red = f;
    } else if (src.includes("saladfish") && !salad) {
      salad = f;
    } else if (src.includes("purplefish") && !purple) {
      purple = f;
    } else if (src.includes("ghostfish") && !ghost) {
      ghost = f;
    } else if (src.includes("bluefish") && !blue) {
      blue = f;
    }

    safety++;
  }

  // Add them in the order you like
  if (bigOrange) fishes.push(bigOrange);
  if (smallOrange) fishes.push(smallOrange);
  if (red) fishes.push(red);
  if (salad) fishes.push(salad);
  if (purple) fishes.push(purple);
  if (ghost) fishes.push(ghost);
  if (blue) fishes.push(blue);
}

function drawDecorations() {
  const bottom = canvas.height;

  // ROCKS (right-bottom)
  if (rockImg.complete) {
    const desiredHeight = canvas.height * 0.20; // 20% of height
    const aspect =
      rockImg.naturalWidth && rockImg.naturalHeight
        ? rockImg.naturalWidth / rockImg.naturalHeight
        : 1;
    const width = desiredHeight * aspect;
    const x = canvas.width * 0.60;   // adjust left/right
    const y = bottom - desiredHeight;
    ctx.drawImage(rockImg, x, y, width, desiredHeight);
  }

  // SEAWEED (left-bottom)
  if (seaweedImg.complete) {
    const desiredHeight = canvas.height * 0.30;
    const aspect =
      seaweedImg.naturalWidth && seaweedImg.naturalHeight
        ? seaweedImg.naturalWidth / seaweedImg.naturalHeight
        : 1;
    const width = desiredHeight * aspect;
    const x = canvas.width * 0.10;
    const y = bottom - desiredHeight;
    ctx.drawImage(seaweedImg, x, y, width, desiredHeight);
  }

  // CORAL (middle-bottom)
  if (coralImg.complete) {
    const desiredHeight = canvas.height * 0.25;
    const aspect =
      coralImg.naturalWidth && coralImg.naturalHeight
        ? coralImg.naturalWidth / coralImg.naturalHeight
        : 1;
    const width = desiredHeight * aspect;
    const x = canvas.width * 0.45;
    const y = bottom - desiredHeight;
    ctx.drawImage(coralImg, x, y, width, desiredHeight);
  }
}
function createRipple(x, y) {
  ripples.push({
    x,
    y,
    startTime: performance.now(),
    maxRadius: canvas.width * 0.18,
    duration: 700,
  });

  // APPLY FORCE TO FISH
  fishes.forEach(fish => {
    const dx = fish.x - x;
    const dy = fish.y - y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    const maxDist = canvas.width * 0.25; // range of effect
    if (dist < maxDist) {
      const strength = (1 - dist/maxDist); // 1 near ripple, 0 far
      const force = strength * 8.5;  // adjust for stronger/weaker push

      // normalize direction
      const nx = dx / dist;
      const ny = dy / dist;

      fish.forceX = nx * force;
      fish.forceY = ny * force;
      fish.forceTime = 400; // ms duration
    }
  });
}

function drawRipples(time) {
  if (!ripples.length) return;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";

  // draw + keep only active ripples
  const alive = [];

  for (const r of ripples) {
    const age = time - r.startTime;
    if (age >= r.duration) continue;

    const t = age / r.duration; // 0 → 1
    const radius = r.maxRadius * t;

    // fade out alpha
    const alpha = (1 - t) * 0.6;

    // a couple of rings for nicer effect
    for (let i = 0; i < 2; i++) {
      const innerT = t + i * 0.06;
      if (innerT < 0 || innerT > 1) continue;
      const innerRadius = r.maxRadius * innerT;
      const innerAlpha = (1 - innerT) * 0.5;

      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${innerAlpha})`;
      ctx.arc(r.x, r.y, innerRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    alive.push(r);
  }

  ctx.restore();

  // keep only still-alive ripples
  ripples.length = 0;
  ripples.push(...alive);
}





// ---- MAIN LOOP ----
function loop(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

  drawRipples(timestamp);

  for (const fish of fishes) {
    fish.update(timestamp);
    fish.draw(ctx);
  }

  // draw speech bubble above fish (if any)
  drawBubble();

  requestAnimationFrame(loop);
}


// ----- DRAG TO SCROLL (Horizontal) -----
const scrollContainer = document.getElementById("scroll-container");

let isDown = false;
let startX;
let scrollLeft;

scrollContainer.addEventListener("mousedown", (e) => {
  isDown = true;
  startX = e.pageX - scrollContainer.offsetLeft;
  scrollLeft = scrollContainer.scrollLeft;
});

scrollContainer.addEventListener("mouseleave", () => {
  isDown = false;
});

scrollContainer.addEventListener("mouseup", () => {
  isDown = false;
});

scrollContainer.addEventListener("mousemove", (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - scrollContainer.offsetLeft;
  const walk = (x - startX) * 1.2; // scroll speed
  scrollContainer.scrollLeft = scrollLeft - walk;
});

// ----- TOUCH SUPPORT -----
scrollContainer.addEventListener("touchstart", (e) => {
  isDown = true;
  startX = e.touches[0].pageX - scrollContainer.offsetLeft;
  scrollLeft = scrollContainer.scrollLeft;
});

scrollContainer.addEventListener("touchend", () => {
  isDown = false;
});

scrollContainer.addEventListener("touchmove", (e) => {
  if (!isDown) return;
  const x = e.touches[0].pageX - scrollContainer.offsetLeft;
  const walk = (x - startX) * 1.2;
  scrollContainer.scrollLeft = scrollLeft - walk;
});

// returns true if we clicked/tapped a fish
function handleFishTap(pos) {
  for (const fish of fishes) {
    const dx = pos.x - fish.x;
    const dy = pos.y - fish.y;
    const r = Math.min(fish.width, fish.height) * 0.55;

    if (dx * dx + dy * dy <= r * r) {
      const type = getFishType(fish);

      if (type === "redfish" || type === "bluefish") {
        // 60% → animation, 40% → text bubble
        const rnd = Math.random();
        if (rnd < 0.6) {
          fish.playClickAnimation();
        } else {
          showBubbleForFish(fish);
        }
      } else {
        // other fish: only text, only animation, or mix – you choose
        // example: only text
        showBubbleForFish(fish);
        // or: fish.playClickAnimation();
      }

      return true; // hit a fish
    }
  }
  return false; // no fish hit
}

// ---- LONG PRESS SCHOOL MODE ----
function startSchoolPress(e) {
  isSchoolPressing = true;

  const pos = getCanvasPos(e);
  lastPressPos = pos;
  pressStartTime = performance.now();
  longPressActivated = false;

  // set a 2 second timer for long press
  longPressTimer = setTimeout(() => {
    if (!isSchoolPressing) return; // user released before 2s
    schoolMode = true;
    schoolTarget = pos; // initial target where you pressed
    longPressActivated = true;
  }, 2000); // 2000ms = 2 seconds
}

function moveSchoolPress(e) {
  if (!isSchoolPressing) return;
  if (!schoolMode) return; // not yet in school mode

  const pos = getCanvasPos(e);
  schoolTarget = pos; // move group target as finger/mouse moves
}

function endSchoolPress() {
  const wasSchoolMode = schoolMode;

  isSchoolPressing = false;

  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  // detect short tap (no school mode, no long press)
  const now = performance.now();
  const pressDuration = now - pressStartTime;

  if (
    !wasSchoolMode &&            // school mode never activated
    !longPressActivated &&       // timer didn’t fire
    lastPressPos &&              // we have a position
    pressDuration < 250          // < 250ms → quick tap
  ) {
    createRipple(lastPressPos.x, lastPressPos.y);
  }

  // just stop school mode, DO NOT change baseX/baseY
  schoolMode = false;

  // AFTER leaving school mode, spread red + purple fish a bit
  if (wasSchoolMode) {
    spreadFloatFishAfterSchool();
  }
}

// Mouse events
canvas.addEventListener("mousedown", (e) => {
  const pos = getCanvasPos(e);

  // If we clicked/tapped a fish → 60% animation / 40% text
  if (handleFishTap(pos)) {
    return; // don’t start ripple / school mode
  }

  // Otherwise → normal long-press / ripple logic
  startSchoolPress(e);
});

canvas.addEventListener("mousemove", (e) => {
  moveSchoolPress(e);
});

window.addEventListener("mouseup", () => {
  if (isSchoolPressing) {
    endSchoolPress();
  }
});
// Touch events (for phones)
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const pos = getCanvasPos(e);

  // If we tapped a fish → 60% animation / 40% text
  if (handleFishTap(pos)) {
    return; // stop here, no ripple / school
  }

  // Otherwise → normal long-press / ripple logic
  startSchoolPress(e);
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  moveSchoolPress(e);
});

canvas.addEventListener("touchend", () => {
  if (isSchoolPressing) {
    endSchoolPress();
  }
});
canvas.addEventListener("touchcancel", () => {
  if (isSchoolPressing) {
    endSchoolPress();
  }
});
// ===== TASK PNG POPUP OPEN/CLOSE (FADE) =====
const taskBtn = document.getElementById("task-btn");
const taskPopup = document.getElementById("task-popup");

if (taskBtn && taskPopup) {
  // open
  taskBtn.addEventListener("click", (e) => {
    e.preventDefault();
    taskPopup.classList.add("show");
  });

  // close when tapping dark area
  taskPopup.addEventListener("click", (e) => {
    if (e.target === taskPopup) {
      taskPopup.classList.remove("show");
    }
  });
}
// ===== CLOSE POPUP BY CLICKING X AREA ON THE PNG =====
const popupImg = document.getElementById("task-popup-img");

if (popupImg) {
  popupImg.addEventListener("click", (e) => {
    const rect = popupImg.getBoundingClientRect();
    const x = e.clientX - rect.left;  // position inside image
    const y = e.clientY - rect.top;

    // ---- ADJUST THESE VALUES based on your PNG ----
    // X button area (in pixels of the displayed size)
    const xLeft = 0;       // left boundary of X
    const xRight = 40;     // right boundary of X
    const yTop = 0;        // top boundary of X
    const yBottom = 40;    // bottom boundary of X

if (x >= xLeft && x <= xRight && y >= yTop && y <= yBottom) {
  const popup = document.getElementById("task-popup");
  popup.classList.remove("show");  // CLOSE popup
}
  });
}

// ===== SHOP FULL PAGE OPEN/CLOSE =====
const shopBtn = document.getElementById("shop-btn");
const shopFull = document.getElementById("shop-fullpage");
const shopFullImg = document.getElementById("shop-fullpage-img");

if (shopBtn && shopFull) {
  // open
  shopBtn.addEventListener("click", () => {
    shopFull.classList.add("show");
  });
}

// close by tapping the "back arrow" in PNG
if (shopFullImg && shopFull) {
  shopFullImg.addEventListener("click", (e) => {
    const rect = shopFullImg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Back arrow hitbox (left top area)
    if (x <= rect.width * 0.25 && y <= rect.height * 0.2) {
      shopFull.classList.remove("show");
    }
  });
}


// ----- STORAGE PANEL SLIDE UP -----
const storageBtn = document.getElementById("storage-btn");
const storagePanel = document.getElementById("storage-panel");

if (storageBtn && storagePanel) {
  storageBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const isOpen = storagePanel.classList.toggle("show");

    if (isOpen) {
      storageBtn.classList.add("active");
    } else {
      storageBtn.classList.remove("active");
    }
  });
}

// ----- CLOSE storage PANEL BY CLICKING X ON THE PNG -----
const storagePanelImg = document.getElementById("storage-panel-img");

if (storagePanelImg && storagePanel) {
  storagePanelImg.addEventListener("click", (e) => {
    const rect = storagePanelImg.getBoundingClientRect();
    const x = e.clientX - rect.left;   // position inside image
    const y = e.clientY - rect.top;

    // Make the whole top-right corner clickable:
    //  - right 30% of the image
    //  - top 50% of the image
    const inRightSide = x >= rect.width * 0.9;
    const inTopHalf  = y <= rect.height * 0.4;

    if (inRightSide && inTopHalf) {
      storagePanel.classList.remove("show");   // slide down (CSS)
      if (storageBtn) storageBtn.classList.remove("active");
    }
  });
}

