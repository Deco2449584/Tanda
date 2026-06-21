import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#001A3F',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: '6px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 36,
            fontWeight: 800,
          }}
        >
          C
        </div>
        <div
          style={{
            marginTop: 12,
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          CONTINENTAL
        </div>
      </div>
    ),
    { ...size },
  );
}
