import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#001A3F',
          borderRadius: 6,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: '3px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          C
        </div>
      </div>
    ),
    { ...size },
  );
}
