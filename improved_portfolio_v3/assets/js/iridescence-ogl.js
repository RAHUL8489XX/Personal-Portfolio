// Iridescence Background Animation using OGL Library
// This is a vanilla JavaScript implementation without React

class IridescenceOGL {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('Container not found:', containerId);
      return;
    }

    this.color = options.color || [0.2901960784313726, 0.7019607843137254, 0.796078431372549];
    this.amplitude = options.amplitude || 0.1;
    this.speed = options.speed || 1.0;
    this.mouseReact = options.mouseReact !== false;

    this.mousePos = { x: 0.5, y: 0.5 };
    this.animationId = null;
    this.startTime = Date.now();

    this.init();
  }

  init() {
    // Wait for OGL to be loaded
    if (typeof OGL === 'undefined') {
      console.error('OGL library not loaded');
      return;
    }

    const { Renderer, Program, Mesh, Color, Triangle } = OGL;

    const vertexShader = `
      attribute vec2 uv;
      attribute vec2 position;

      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
      }
    `;

    const fragmentShader = `
      precision highp float;

      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uResolution;
      uniform vec2 uMouse;
      uniform float uAmplitude;
      uniform float uSpeed;

      varying vec2 vUv;

      void main() {
        float mr = min(uResolution.x, uResolution.y);
        vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

        uv += (uMouse - vec2(0.5)) * uAmplitude;

        float d = -uTime * 0.5 * uSpeed;
        float a = 0.0;
        for (float i = 0.0; i < 8.0; ++i) {
          a += cos(i - d - a * uv.x);
          d += sin(uv.y * i + a);
        }
        d += uTime * 0.5 * uSpeed;
        vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
        col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    // Create renderer
    const renderer = new Renderer({
      width: this.container.offsetWidth,
      height: this.container.offsetHeight,
      dpr: window.devicePixelRatio,
      antialias: true,
      alpha: true,
    });

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    // Append canvas to container
    this.container.appendChild(gl.canvas);
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.display = 'block';

    // Create program
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(...this.color) },
        uResolution: {
          value: new Color(
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height
          ),
        },
        uMouse: { value: new Float32Array([this.mousePos.x, this.mousePos.y]) },
        uAmplitude: { value: this.amplitude },
        uSpeed: { value: this.speed },
      },
    });

    // Create geometry
    const geometry = new Triangle(gl);
    const mesh = new Mesh(gl, { geometry, program });

    // Store references
    this.renderer = renderer;
    this.gl = gl;
    this.program = program;
    this.mesh = mesh;

    // Handle resize
    const handleResize = () => {
      const width = this.container.offsetWidth;
      const height = this.container.offsetHeight;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = new Color(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / gl.canvas.height
      );
    };

    window.addEventListener('resize', handleResize);
    this.resizeHandler = handleResize;

    // Handle mouse move
    if (this.mouseReact) {
      const handleMouseMove = (e) => {
        const rect = this.container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1.0 - (e.clientY - rect.top) / rect.height;
        this.mousePos = { x, y };
        program.uniforms.uMouse.value[0] = x;
        program.uniforms.uMouse.value[1] = y;
      };

      this.container.addEventListener('mousemove', handleMouseMove);
      this.mouseMoveHandler = handleMouseMove;
    }

    // Animation loop
    const animate = () => {
      const elapsed = (Date.now() - this.startTime) * 0.001;
      program.uniforms.uTime.value = elapsed;
      renderer.render({ scene: mesh });
      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    if (this.mouseMoveHandler) {
      this.container.removeEventListener('mousemove', this.mouseMoveHandler);
    }

    if (this.gl && this.gl.canvas) {
      const ext = this.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
      this.gl.canvas.remove();
    }

    this.renderer = null;
    this.gl = null;
    this.program = null;
    this.mesh = null;
  }
}
