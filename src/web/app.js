import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { USDLoader } from "three/addons/loaders/USDLoader.js";

const fallbackViewportSize = {
  width: 960,
  height: 540
};

const elements = {
  page: document.getElementById("viewerPage"),
  fileInput: document.getElementById("fileInput"),
  fileName: document.getElementById("fileName"),
  resetButton: document.getElementById("resetButton"),
  rotateLeftButton: document.getElementById("rotateLeftButton"),
  rotateRightButton: document.getElementById("rotateRightButton"),
  status: document.getElementById("viewerStatus"),
  viewport: document.getElementById("viewport")
};

let scene;
let camera;
let renderer;
let controls;
let model = null;
let objectUrl = null;
let animationFrame = null;
let rotationTicks = 0;

function isUsdz(file) {
  return file.name.toLowerCase().endsWith(".usdz");
}

function setStatus(status, message) {
  elements.status.textContent = message;
  elements.status.className = `status-message status-${status}`;
  elements.viewport.dataset.viewerStatus = status;
  const isLoaded = status === "loaded";
  elements.rotateLeftButton.disabled = !isLoaded;
  elements.rotateRightButton.disabled = !isLoaded;
}

function setRotationTicks(nextValue) {
  rotationTicks = nextValue;
  elements.viewport.dataset.rotationTicks = String(rotationTicks);
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }

    const material = child.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

function centerAndScaleObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    return { radius: 1 };
  }

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);

  const maxDimension = Math.max(size.x, size.y, size.z);
  if (maxDimension > 0) {
    object.scale.multiplyScalar(2.8 / maxDimension);
  }

  const scaledBox = new THREE.Box3().setFromObject(object);
  return {
    radius: Math.max(1, scaledBox.getSize(new THREE.Vector3()).length() * 0.5)
  };
}

function fitView(radius = 1) {
  camera.position.set(radius * 1.9, radius * 1.2, radius * 2.2);
  camera.near = Math.max(0.01, radius / 100);
  camera.far = Math.max(100, radius * 100);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  controls.update();
}

function clearModel() {
  if (model) {
    scene.remove(model);
    disposeObject(model);
  }
  model = null;
  setRotationTicks(0);
}

async function loadUsdz(url, name) {
  setStatus("loading", `Loading ${name}...`);
  clearModel();

  try {
    const loader = new USDLoader();
    const loadedModel = await loader.loadAsync(url);
    loadedModel.name = name;
    const { radius } = centerAndScaleObject(loadedModel);
    scene.add(loadedModel);
    model = loadedModel;
    elements.fileName.textContent = name;
    fitView(radius);
    setStatus("loaded", "USDZ loaded in the browser. Orbit with mouse/touch or use the rotate buttons.");
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown loader error";
    setStatus("error", `Could not render this USDZ in the browser: ${detail}`);
  }
}

function loadFiles(files) {
  const usdzFile = Array.from(files).find(isUsdz);

  if (!usdzFile) {
    setStatus("error", "No USDZ file was selected. Load a `.usdz` file.");
    return;
  }

  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }

  objectUrl = URL.createObjectURL(usdzFile);
  elements.fileName.textContent = usdzFile.name;
  void loadUsdz(objectUrl, usdzFile.name);
}

function rotateModel(direction) {
  if (!model) {
    return;
  }

  model.rotation.y += direction * (Math.PI / 12);
  setRotationTicks(rotationTicks + direction);
}

function resetView() {
  if (!model) {
    fitView();
    return;
  }

  model.rotation.set(0, 0, 0);
  setRotationTicks(0);
  const box = new THREE.Box3().setFromObject(model);
  const radius = Math.max(1, box.getSize(new THREE.Vector3()).length() * 0.5);
  fitView(radius);
}

function resizeViewport() {
  const width = elements.viewport.clientWidth;
  const height = elements.viewport.clientHeight;

  if (width <= 0 || height <= 0) {
    return;
  }

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate() {
  controls.update();

  if (elements.viewport.clientWidth > 0 && elements.viewport.clientHeight > 0) {
    renderer.render(scene, camera);
  }

  animationFrame = requestAnimationFrame(animate);
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfafafa);

  camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setSize(fallbackViewportSize.width, fallbackViewportSize.height, false);
  elements.viewport.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;

  const ambient = new THREE.HemisphereLight(0xffffff, 0x606060, 2.2);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);

  const grid = new THREE.GridHelper(5, 20, 0xd6d2c8, 0xe8e3d7);
  grid.position.y = -1.42;
  scene.add(grid);

  const resizeObserver = new ResizeObserver(resizeViewport);
  resizeObserver.observe(elements.viewport);
  resizeViewport();
  fitView();
  animate();

  window.addEventListener("beforeunload", () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    resizeObserver.disconnect();
    clearModel();
    controls.dispose();
    renderer.dispose();
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  });
}

elements.fileInput.addEventListener("change", (event) => {
  if (event.target.files?.length) {
    loadFiles(event.target.files);
  }
});

elements.resetButton.addEventListener("click", resetView);
elements.rotateLeftButton.addEventListener("click", () => rotateModel(-1));
elements.rotateRightButton.addEventListener("click", () => rotateModel(1));

elements.page.addEventListener("dragenter", (event) => {
  event.preventDefault();
  elements.page.classList.add("is-drop-active");
});

elements.page.addEventListener("dragover", (event) => {
  event.preventDefault();
});

elements.page.addEventListener("dragleave", () => {
  elements.page.classList.remove("is-drop-active");
});

elements.page.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.page.classList.remove("is-drop-active");

  if (event.dataTransfer.files.length) {
    loadFiles(event.dataTransfer.files);
  }
});

initScene();
