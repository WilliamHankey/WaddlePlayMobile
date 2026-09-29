import { createElement, type ReactElement } from "react";

/**
 * Preview media for documents whose images are external URLs.
 *
 * `preview.media` has to be a React element or a Sanity image reference.
 * Handing it the raw URL string makes the Studio call `createElement(url)`,
 * which throws "The tag name provided (...) is not a valid name" and takes
 * down the whole document list.
 *
 * Returns undefined when there is no image, so the preview falls back to the
 * default icon instead of an empty box.
 */
export function urlPreview(src: string | null | undefined): ReactElement | undefined {
  if (!src) return undefined;
  return createElement("img", {
    src,
    alt: "",
    style: { width: "100%", height: "100%", objectFit: "cover" },
  });
}
