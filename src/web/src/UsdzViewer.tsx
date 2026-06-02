import "@google/model-viewer";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";

const defaultUsdzPath = "./models/triangle-choke-closed-guard.usdz";
const defaultFileName = "triangle-choke-closed-guard.usdz";

function isUsdz(file: File) {
  return file.name.toLowerCase().endsWith(".usdz");
}

function isGlb(file: File) {
  return file.name.toLowerCase().endsWith(".glb");
}

export function UsdzViewer() {
  const [usdzUrl, setUsdzUrl] = useState(defaultUsdzPath);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState(defaultFileName);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [status, setStatus] = useState(
    "Default USDZ target selected. Add a matching GLB preview for browser orbit controls."
  );
  const [dropActive, setDropActive] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);
  const viewerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function clearObjectUrls() {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }

  function makeObjectUrl(file: File) {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    return url;
  }

  function loadFiles(files: FileList | File[]) {
    const fileList = Array.from(files);
    const usdzFile = fileList.find(isUsdz);
    const glbFile = fileList.find(isGlb);

    if (!usdzFile && !glbFile) {
      setStatus("No supported model was selected. Load a USDZ file or a GLB browser preview.");
      return;
    }

    clearObjectUrls();

    if (usdzFile) {
      setUsdzUrl(makeObjectUrl(usdzFile));
      setFileName(usdzFile.name);
    } else {
      setUsdzUrl("");
      setFileName("No USDZ selected");
    }

    if (glbFile) {
      setPreviewUrl(makeObjectUrl(glbFile));
      setPreviewFileName(glbFile.name);
    } else {
      setPreviewUrl(null);
      setPreviewFileName(null);
    }

    if (usdzFile && glbFile) {
      setStatus("USDZ source loaded with a GLB browser preview for orbit controls.");
    } else if (usdzFile) {
      setStatus(
        "USDZ source loaded. Inline browser orbit preview requires a matching GLB file; use Open USDZ or Download USDZ for this file."
      );
    } else {
      setStatus("GLB preview loaded. Add the matching USDZ to keep the review USDZ-first.");
    }
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

  function resetView() {
    const viewer = viewerRef.current as
      | (HTMLElement & {
          cameraOrbit?: string;
          fieldOfView?: string;
          jumpCameraToGoal?: () => void;
        })
      | null;

    if (!viewer || !previewUrl) {
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
            Load Model
            <input
              accept=".usdz,.glb,model/vnd.usdz+zip,model/gltf-binary"
              multiple
              type="file"
              onChange={onFileChange}
            />
          </label>
          <button type="button" onClick={resetView} disabled={!previewUrl}>
            Reset View
          </button>
        </div>
      </header>

      <section className="review-layout" aria-label="USDZ model review">
        <aside className="model-meta">
          <span>Current file</span>
          <strong>{fileName}</strong>
          {previewFileName ? (
            <>
              <span className="meta-label">Browser preview</span>
              <strong>{previewFileName}</strong>
            </>
          ) : null}
          <p>
            {status}
          </p>
          <div className="meta-actions">
            {usdzUrl ? (
              <>
                <a className="action-link" href={usdzUrl} rel="ar">
                  Open USDZ
                </a>
                <a className="action-link" href={usdzUrl} download={fileName}>
                  Download USDZ
                </a>
              </>
            ) : null}
          </div>
        </aside>

        <div className="viewer-surface">
          {previewUrl ? (
            <model-viewer
              ref={viewerRef}
              src={previewUrl}
              ios-src={usdzUrl || undefined}
              alt={`BJJ model preview: ${previewFileName ?? fileName}`}
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
          ) : (
            <div className="usdz-fallback" role="status">
              <h2>USDZ loaded</h2>
              <p>
                This file is ready for Apple Quick Look or download. Inline orbit
                preview in this web viewer needs a matching `.glb` companion file.
              </p>
              <div className="fallback-actions">
                {usdzUrl ? (
                  <>
                    <a className="action-link" href={usdzUrl} rel="ar">
                      Open USDZ
                    </a>
                    <a className="action-link" href={usdzUrl} download={fileName}>
                      Download USDZ
                    </a>
                  </>
                ) : null}
              </div>
            </div>
          )}
          <div className="drop-hint">Drop USDZ or GLB to inspect</div>
        </div>
      </section>
    </main>
  );
}
