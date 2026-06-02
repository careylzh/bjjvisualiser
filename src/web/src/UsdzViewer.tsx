import "@google/model-viewer";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";

const defaultModelPath = "./models/triangle-choke-closed-guard.usdz";

function isUsdz(file: File) {
  return file.name.toLowerCase().endsWith(".usdz");
}

export function UsdzViewer() {
  const [modelUrl, setModelUrl] = useState(defaultModelPath);
  const [fileName, setFileName] = useState("triangle-choke-closed-guard.usdz");
  const [dropActive, setDropActive] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const viewerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function loadFile(file: File) {
    if (!isUsdz(file)) {
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setModelUrl(nextUrl);
    setFileName(file.name);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      loadFile(file);
    }
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDropActive(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      loadFile(file);
    }
  }

  function resetView() {
    const viewer = viewerRef.current as
      | (HTMLElement & {
          cameraOrbit?: string;
          fieldOfView?: string;
          jumpCameraToGoal?: () => void;
        })
      | null;

    if (!viewer) {
      return;
    }

    viewer.cameraOrbit = "0deg 75deg auto";
    viewer.fieldOfView = "35deg";
    viewer.jumpCameraToGoal?.();
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
          <p>USDZ-first scene review</p>
        </div>
        <div className="actions">
          <label className="file-button">
            Load USDZ
            <input accept=".usdz,model/vnd.usdz+zip" type="file" onChange={onFileChange} />
          </label>
          <button type="button" onClick={resetView}>
            Reset View
          </button>
        </div>
      </header>

      <section className="review-layout" aria-label="USDZ model review">
        <aside className="model-meta">
          <span>Current file</span>
          <strong>{fileName}</strong>
          <p>
            Drop a `.usdz` file anywhere on this page or load one from the file
            picker. Place generated exports in `public/models/` for GitHub Pages.
          </p>
        </aside>

        <div className="viewer-surface">
          <model-viewer
            ref={viewerRef}
            src={modelUrl}
            ios-src={modelUrl}
            alt={`BJJ USDZ model: ${fileName}`}
            camera-controls
            touch-action="pan-y"
            auto-rotate
            ar
            ar-modes="webxr scene-viewer quick-look"
            shadow-intensity="0.7"
            camera-orbit="0deg 75deg auto"
            field-of-view="35deg"
            exposure="0.95"
            loading="eager"
            reveal="auto"
          />
          <div className="drop-hint">Drop USDZ to inspect</div>
        </div>
      </section>
    </main>
  );
}
