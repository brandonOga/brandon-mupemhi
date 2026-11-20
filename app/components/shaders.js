export const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fragmentShader = `
uniform sampler2D map;
uniform float imageAspect, planeAspect, glitchIntensity, time;
uniform vec2 iResolution;
varying vec2 vUv;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

vec2 coverUV(vec2 uv) {
  if (planeAspect > imageAspect) {
    float s = imageAspect / planeAspect;
    uv.y = uv.y * s + (1.0 - s) * 0.5;
  } else {
    float s = planeAspect / imageAspect;
    uv.x = uv.x * s + (1.0 - s) * 0.5;
  }
  return uv;
}

void main() {
  vec2 uv = vUv;
  float gi = glitchIntensity;

  uv.x += (hash(floor(uv.y * 20.0 + time * 80.0) + time * 7.0) - 0.5) * 2.0 * gi * 0.15;
  uv.y += (hash(floor(time * 50.0)) - 0.5) * gi * 0.06;

  // Colour split only while glitching; at rest the channels line up so text
  // stays crisp.
  float rs = gi * 0.025;

  // Colours are sampled in linear space (the texture is sRGB) and converted
  // back to sRGB at the end, so the image keeps its own brightness. A small
  // black lift, the vignette and tint give the CRT feel without washing it out.
  vec3 col;
  col.r = texture2D(map, coverUV(vec2(uv.x + rs, uv.y + rs))).r;
  col.g = texture2D(map, coverUV(vec2(uv.x, uv.y - rs * 2.0))).g;
  col.b = texture2D(map, coverUV(vec2(uv.x - rs * 2.0, uv.y))).b;

  col = col * 0.98 + 0.004;
  col *= vec3(pow(16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y), 0.12));
  col *= vec3(0.97, 1.02, 0.97);
  col = clamp(col, 0.0, 1.0);
  //col *= vec3(0.9 + 0.1 * pow(clamp(0.35 + 0.35 * sin(uv.y * iResolution.y * 1.5), 0.0, 1.0), 1.2));
  //col *= 1.0 - 0.1 * vec3(clamp((mod(vUv.x * iResolution.x, 2.0) - 1.0) * 2.0, 0.0, 1.0));
  col += vec3(hash(uv.x * 100.0 + uv.y * 1000.0 + time * 300.0) * gi * 0.3);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;