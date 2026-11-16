"use strict";

const canvas = document.querySelector("#preview");
const context = canvas.getContext("2d", { alpha: false });
const save = document.querySelector("#save");
const status = document.querySelector("#status");
const presets = document.querySelector("#presets");
const logo = new Image();
let logoReady = false;
let background = null;
let activePreset = 0;
let exporting = false;
const pending = new Set();

const themes = [
  { name: "ルビー", colors: ["#200e29", "#852451", "#d64f63"] },
  { name: "オーロラ", colors: ["#151b41", "#4454a0", "#878de0"] },
  { name: "ラグーン", colors: ["#122e42", "#246f85", "#69b8ab"] },
  { name: "ミッドナイト", colors: ["#121527", "#29335a", "#6a5297"] },
  { name: "アンバー", colors: ["#2e192c", "#954735", "#d99b55"] }
];

const performers = [
  { id: "vocal", label: "ボーカル", x: 240, y: 180, size: 620, nameSize: 88, maxWidth: 800 },
  { id: "composer", label: "コンポーザー", x: 1170, y: 360, size: 440, nameSize: 64, maxWidth: 620 }
].map(performer => ({
  ...performer,
  image: null,
  name: document.querySelector(`#${performer.id}-name`)
}));

function cover(image, x, y, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  context.drawImage(image, (image.naturalWidth - cropWidth) / 2,
    (image.naturalHeight - cropHeight) / 2, cropWidth, cropHeight, x, y, width, height);
}

function drawTheme(theme) {
  const [dark, middle, light] = theme.colors;
  const gradient = context.createLinearGradient(280, 1080, 1680, 0);
  gradient.addColorStop(0, dark);
  gradient.addColorStop(0.58, middle);
  gradient.addColorStop(1, light);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.translate(1080, 380);
  context.rotate(-0.33);
  context.strokeStyle = "#ffffff24";
  context.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    context.beginPath();
    context.ellipse(0, 0, 390 + 58 * i, 210 + 42 * i, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

function drawName(name, performer) {
  let size = performer.nameSize;
  do {
    context.font = `800 ${size}px "Hiragino Sans", Meiryo, system-ui, sans-serif`;
    if (context.measureText(name).width <= performer.maxWidth) break;
    size -= 2;
  } while (size >= 30);

  if (size < 30) return false;
  const x = performer.x + performer.size / 2;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "#100d18";
  context.lineWidth = Math.max(3, size / 18);
  context.fillStyle = "#fff";
  context.strokeText(name, x, 890);
  context.fillText(name, x, 890);
  return true;
}

function render() {
  if (background) cover(background, 0, 0, canvas.width, canvas.height);
  else drawTheme(themes[activePreset]);

  let ready = true;
  let longName = false;
  for (const performer of performers) {
    const { image, x, y, size, label } = performer;
    context.fillStyle = "#21192f";
    context.fillRect(x, y, size, size);
    if (image) cover(image, x, y, size, size);
    else {
      context.fillStyle = "#e6daf8";
      context.font = "600 36px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(label, x + size / 2, y + size / 2);
    }
    const name = performer.name.value.trim();
    const fits = drawName(name, performer);
    longName ||= !fits;
    ready &&= Boolean(image && name && fits);
    performer.name.setCustomValidity(fits ? "" : "画像に収まるよう名前を短くしてください。");
  }

  if (logoReady) {
    const scale = Math.min(136 / logo.naturalWidth, 122 / logo.naturalHeight);
    const width = logo.naturalWidth * scale;
    const height = logo.naturalHeight * scale;
    context.drawImage(logo, canvas.width - 24 - width, canvas.height - 24 - height, width, height);
  }
  save.disabled = !ready || !logoReady || pending.size > 0 || exporting;
  return longName;
}

function selectPreset(index) {
  activePreset = index;
  background = null;
  document.querySelector("#background").value = "";
  pending.delete("background");
  updatePresetButtons();
  status.textContent = "";
  render();
}

function updatePresetButtons() {
  [...presets.children].forEach((button, index) => {
    button.setAttribute("aria-pressed", String(!background && index === activePreset));
  });
}

function bindImage(id, acceptImage) {
  const input = document.querySelector(`#${id}`);
  let request = 0;
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const version = ++request;
    pending.add(id);
    status.textContent = "";
    render();
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (version === request && input.files[0] === file) acceptImage(image);
    } catch {
      if (version === request && input.files[0] === file) {
        input.value = "";
        status.textContent = "画像を読み込めませんでした。PNGやJPEGなどの画像を選んでください。";
      }
    } finally {
      URL.revokeObjectURL(url);
      if (version === request) {
        pending.delete(id);
        render();
      }
    }
  });
}

for (const [index, theme] of themes.entries()) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = theme.name;
  button.style.background = `linear-gradient(140deg, ${theme.colors[0]}, ${theme.colors[1]})`;
  button.addEventListener("click", () => selectPreset(index));
  presets.append(button);
}
updatePresetButtons();
bindImage("background", image => {
  background = image;
  updatePresetButtons();
});

for (const performer of performers) {
  bindImage(performer.id, image => { performer.image = image; });
  performer.name.addEventListener("input", () => {
    status.textContent = render() ? "画像に収まるよう名前を短くしてください。" : "";
  });
}

logo.addEventListener("load", () => {
  logoReady = true;
  render();
});
logo.addEventListener("error", () => {
  status.textContent = "ロゴを読み込めませんでした。ページを再読み込みしてください。";
});
logo.src = "assets/logo.png";

save.addEventListener("click", () => {
  exporting = true;
  render();
  canvas.toBlob(blob => {
    exporting = false;
    render();
    if (!blob) {
      status.textContent = "画像を保存できませんでした。もう一度お試しください。";
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "first-step-project.png";
    link.href = url;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status.textContent = "PNGのダウンロードを開始しました。";
  }, "image/png");
});

window.addEventListener("pageshow", () => {
  for (const input of document.querySelectorAll("input")) input.value = "";
  render();
}, { once: true });
render();
