import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export type ViewRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Maps a rectangle on a cover-fitted camera preview to crop coords on the photo.
 * Preview uses resizeMode "cover" (default for CameraView).
 */
export function mapCoverFrameToImageCrop(params: {
  imageWidth: number;
  imageHeight: number;
  viewWidth: number;
  viewHeight: number;
  frame: ViewRect;
  /** Expand crop slightly so letter edges are not clipped (0–0.2). */
  paddingRatio?: number;
}): ViewRect {
  const {
    imageWidth,
    imageHeight,
    viewWidth,
    viewHeight,
    frame,
    paddingRatio = 0.06,
  } = params;

  const scale = Math.max(viewWidth / imageWidth, viewHeight / imageHeight);
  const displayedWidth = imageWidth * scale;
  const displayedHeight = imageHeight * scale;
  const offsetX = (displayedWidth - viewWidth) / 2;
  const offsetY = (displayedHeight - viewHeight) / 2;

  const padX = frame.width * paddingRatio;
  const padY = frame.height * paddingRatio;

  let originX = (frame.x - padX + offsetX) / scale;
  let originY = (frame.y - padY + offsetY) / scale;
  let width = (frame.width + padX * 2) / scale;
  let height = (frame.height + padY * 2) / scale;

  originX = Math.max(0, Math.floor(originX));
  originY = Math.max(0, Math.floor(originY));
  width = Math.max(1, Math.min(Math.ceil(width), imageWidth - originX));
  height = Math.max(1, Math.min(Math.ceil(height), imageHeight - originY));

  return { x: originX, y: originY, width, height };
}

/** Crops a captured camera photo to the on-screen ULD frame region. */
export async function cropPhotoToViewFrame(params: {
  photoUri: string;
  photoWidth: number;
  photoHeight: number;
  viewWidth: number;
  viewHeight: number;
  frame: ViewRect;
}): Promise<string> {
  const crop = mapCoverFrameToImageCrop({
    imageWidth: params.photoWidth,
    imageHeight: params.photoHeight,
    viewWidth: params.viewWidth,
    viewHeight: params.viewHeight,
    frame: params.frame,
  });

  const result = await manipulateAsync(
    params.photoUri,
    [
      {
        crop: {
          originX: crop.x,
          originY: crop.y,
          width: crop.width,
          height: crop.height,
        },
      },
    ],
    {
      compress: 0.95,
      format: SaveFormat.JPEG,
    },
  );

  return result.uri;
}
