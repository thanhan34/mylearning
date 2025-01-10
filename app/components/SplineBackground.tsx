"use client";

import Spline from '@splinetool/react-spline/next';

export default function SplineBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <Spline
        scene="https://prod.spline.design/XtCtUp4YdqkhaNTp/scene.splinecode"
        className="w-full h-full"
      />
    </div>
  );
}
