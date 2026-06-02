import {
  ChangeEvent,
  DragEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { USDLoader } from "three/addons/loaders/USDLoader.js";

type LoadStatus = "idle" | "loading" | "loaded" | "error";

function isUsdz(file: File) {
  return file.name.toLowerCase().endsWith(".usdz");
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    const material = mesh.material as
      | THREE.Material
      | THREE.Material[]
      | undefined;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else {
      material?.dispose();
    }
  });
}

function centerAndScaleObject(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    return { radius: 1, center: new THREE.Vector3() };
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
    radius: Math.max(1, scaledBox.getSize(new THREE.Vector3()).length() * 0.5),
    center: new THREE.Vector3()
  };
}

export function UsdzViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const frameRef = useRef<number | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [usdzUrl, setUsdzUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("-");
  const [dropActive, setDropActive] = useState(false);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [message, setMessage] = useState("Choose or drop a USDZ file to view it here.");

  const fitView = useCallback((radius = 1) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) {
      return;
    }

    camera.position.set(radius * 1.9, radius * 1.2, radius * 2.2);
    camera.near = Math.max(0.01, radius / 100);
    camera.far = Math.max(100, radius * 100);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();
  }, []);

  const clearModel = useCallback(() => {
    const scene = sceneRef.current;
    const model = modelRef.current;
    if (scene && model) {
      scene.remove(model);
      disposeObject(model);
    }
    modelRef.current = null;
  }, []);

  const loadUsdz = useCallback(
    async (url: string, name: string) => {
      const scene = sceneRef.current;
      if (!scene) {
        return;
      }

      setStatus("loading");
      setMessage(`Loading ${name}...`);
      clearModel();

      try {
        const loader = new USDLoader();
        const model = await loader.loadAsync(url);
        model.name = name;
        const { radius } = centerAndScaleObject(model);
        scene.add(model);
        modelRef.current = model;
        fitView(radius);
        setStatus("loaded");
        setMessage("USDZ loaded in the browser. Orbit with mouse/touch or use the rotate buttons.");
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown loader error";
        setStatus("error");
        setMessage(`Could not render this USDZ in the browser: ${detail}`);
      }
    },
    [clearModel, fitView]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfafafa);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controlsRef.current = controls;

    const ambient = new THREE.HemisphereLight(0xffffff, 0x606060, 2.2);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const grid = new THREE.GridHelper(5, 20, 0xd6d2c8, 0xe8e3d7);
    grid.position.y = -1.42;
    scene.add(grid);

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();
    fitView();

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      clearModel();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, [clearModel, fitView]);

  useEffect(() => {
    if (usdzUrl) {
      void loadUsdz(usdzUrl, fileName);
    }
  }, [fileName, loadUsdz, usdzUrl]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function loadFiles(files: FileList | File[]) {
    const usdzFile = Array.from(files).find(isUsdz);

    if (!usdzFile) {
      setStatus("error");
      setMessage("No USDZ file was selected. Load a `.usdz` file.");
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const nextUrl = URL.createObjectURL(usdzFile);
    objectUrlRef.current = nextUrl;
    setUsdzUrl(nextUrl);
    setFileName(usdzFile.name);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files?.length) {
      loadFiles(files);
    }
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDropActive(false);
    const files = event.dataTransfer.files;
    if (files.length) {
      loadFiles(files);
    }
  }

  function rotateModel(event: MouseEvent<HTMLButtonElement>, direction: -1 | 1) {
    event.preventDefault();
    const model = modelRef.current;
    if (!model) {
      return;
    }

    model.rotation.y += direction * (Math.PI / 12);
  }

  function resetView() {
    const model = modelRef.current;
    if (!model) {
      fitView();
      return;
    }

    model.rotation.set(0, 0, 0);
    const box = new THREE.Box3().setFromObject(model);
    const radius = Math.max(1, box.getSize(new THREE.Vector3()).length() * 0.5);
    fitView(radius);
  }

  return (
    <main
      className={dropActive ? "viewer-page is-drop-active" : "viewer-page"}
      onDragEnter={(event) => {
        event.preventDefault();
        setDropActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDropActive(false)}
      onDrop={onDrop}
    >
      <header className="top-bar">
        <div>
          <h1>BJJ Visualiser</h1>
          <p>USDZ browser review</p>
        </div>
        <div className="actions">
          <button type="button" onClick={(event) => rotateModel(event, -1)} disabled={status !== "loaded"}>
            Rotate Left
          </button>
          <button type="button" onClick={(event) => rotateModel(event, 1)} disabled={status !== "loaded"}>
            Rotate Right
          </button>
          <button type="button" onClick={resetView}>
            Fit
          </button>
          <label className="file-button">
            Load USDZ
            <input
              accept=".usdz,model/vnd.usdz+zip"
              type="file"
              onChange={onFileChange}
            />
          </label>
        </div>
      </header>

      <section className="review-layout" aria-label="USDZ model review">
        <aside className="model-meta">
          <span>File</span>
          <strong>{fileName}</strong>
          <span className="meta-label">Status</span>
          <strong className={`status-text status-${status}`}>{status}</strong>
          <p>{message}</p>
        </aside>

        <div className="viewer-surface">
          <div ref={containerRef} className="three-canvas" aria-label="USDZ viewport" />
          <div className="drop-hint">Drop USDZ to load it here</div>
        </div>
      </section>
    </main>
  );
}
