/// <reference types="vite/client" />

declare namespace JSX {
  interface IntrinsicElements {
    "model-viewer": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      src?: string;
      "ios-src"?: string;
      alt?: string;
      "camera-controls"?: boolean | string;
      "touch-action"?: string;
      "auto-rotate"?: boolean | string;
      "ar"?: boolean | string;
      "ar-modes"?: string;
      "shadow-intensity"?: string;
      "camera-orbit"?: string;
      "field-of-view"?: string;
      exposure?: string;
      loading?: string;
      reveal?: string;
    };
  }
}

