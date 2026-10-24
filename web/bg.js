// Animated silk background for the hero: domain-warped noise in lilac, cream and white.
// mountSilk(canvas) returns a stop function, or null when WebGL is unavailable (the CSS gradient stays).
const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
uniform vec2 res;
uniform float t;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++){ v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / res;
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / res.y;
  // Diagonal flow, like silk sheets drifting from top left to bottom right
  p = mat2(0.74, -0.67, 0.67, 0.74) * p * 0.9;
  float s = t * 0.035;
  vec2 q = vec2(fbm(p + vec2(0.0, s)), fbm(p + vec2(5.2, 1.3) - s));
  vec2 r = vec2(fbm(p + 3.6 * q + vec2(1.7, 9.2) + s * 1.4), fbm(p + 3.6 * q + vec2(8.3, 2.8) - s));
  float f = fbm(p + 3.2 * r);

  vec3 white  = vec3(0.992, 0.988, 0.996);
  vec3 lilac  = vec3(0.950, 0.855, 0.975);
  vec3 orchid = vec3(0.915, 0.770, 0.960);
  vec3 cream  = vec3(0.992, 0.980, 0.880);
  vec3 mint   = vec3(0.957, 0.988, 0.965);

  vec3 c = mix(white, lilac, smoothstep(0.35, 0.85, f));
  c = mix(c, orchid, smoothstep(0.55, 0.95, f * r.x) * 0.7);
  // Thin cream ribbons along the folds
  c = mix(c, cream, smoothstep(0.06, 0.0, abs(f - 0.52)) * 0.6 * smoothstep(0.3, 0.7, q.y));
  c = mix(c, mint, smoothstep(0.6, 1.0, q.x) * 0.35);
  // Fade towards white at the right edge and the bottom, as in the reference
  c = mix(c, white, smoothstep(0.55, 1.0, uv.x) * 0.45);
  c = mix(c, white, 0.18);
  gl_FragColor = vec4(c, 1.0);
}`;

export function mountSilk(canvas, { scale = 0.5, fps = 30 } = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, 'res');
  const uT = gl.getUniformLocation(prog, 't');

  // Low internal resolution: the image is soft anyway, and the CSS upscale keeps it cheap
  const resize = () => {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = performance.now();
  let raf = 0, last = 0, visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(canvas);
  const draw = (now) => {
    raf = requestAnimationFrame(draw);
    if (!visible || now - last < 1000 / fps) return;
    last = now;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uT, still ? 20 : (now - start) / 1000 + 20);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (still) cancelAnimationFrame(raf);
  };
  raf = requestAnimationFrame(draw);
  canvas.classList.add('on');
  return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
}
