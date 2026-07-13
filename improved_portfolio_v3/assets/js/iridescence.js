// Iridescence Background Animation - Vanilla JS Implementation
// Adapted from OGL library concept to pure WebGL

class IridescenceAnimation {
  constructor(container, options = {}) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
    
    if (!this.gl) {
      console.error('WebGL not supported');
      return;
    }

    this.container.appendChild(this.canvas);
    this.container.style.position = 'relative';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    // Configuration
    this.color = options.color || [0.29, 0.70, 0.80];
    this.amplitude = options.amplitude || 0.1;
    this.speed = options.speed || 1.0;
    this.mouseReact = options.mouseReact !== false;

    // Mouse position
    this.mousePos = { x: 0.5, y: 0.5 };

    // Initialize
    this.init();
    this.setupEventListeners();
    this.resize();
    this.animate();
  }

  init() {
    const gl = this.gl;

    // Vertex Shader
    const vertexShaderSource = `
      attribute vec2 uv;
      attribute vec2 position;
      
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Fragment Shader
    const fragmentShaderSource = `
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

    // Compile shaders
    this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
    gl.useProgram(this.program);

    // Create geometry (full screen triangle)
    const positions = new Float32Array([
      -1, -1,
       3, -1,
      -1,  3
    ]);

    const uvs = new Float32Array([
      0, 0,
      2, 0,
      0, 2
    ]);

    // Position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // UV buffer
    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

    const uvLocation = gl.getAttribLocation(this.program, 'uv');
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    this.uniforms = {
      uTime: gl.getUniformLocation(this.program, 'uTime'),
      uColor: gl.getUniformLocation(this.program, 'uColor'),
      uResolution: gl.getUniformLocation(this.program, 'uResolution'),
      uMouse: gl.getUniformLocation(this.program, 'uMouse'),
      uAmplitude: gl.getUniformLocation(this.program, 'uAmplitude'),
      uSpeed: gl.getUniformLocation(this.program, 'uSpeed')
    };

    // Set initial uniform values
    gl.uniform3f(this.uniforms.uColor, this.color[0], this.color[1], this.color[2]);
    gl.uniform1f(this.uniforms.uAmplitude, this.amplitude);
    gl.uniform1f(this.uniforms.uSpeed, this.speed);
  }

  createProgram(vertexSource, fragmentSource) {
    const gl = this.gl;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
    }

    return program;
  }

  resize() {
    const gl = this.gl;
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;

    this.canvas.width = width;
    this.canvas.height = height;

    gl.viewport(0, 0, width, height);
    gl.uniform3f(this.uniforms.uResolution, width, height, width / height);
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.resize());

    if (this.mouseReact) {
      this.container.addEventListener('mousemove', (e) => {
        const rect = this.container.getBoundingClientRect();
        this.mousePos.x = (e.clientX - rect.left) / rect.width;
        this.mousePos.y = 1.0 - (e.clientY - rect.top) / rect.height;
      });
    }
  }

  animate = () => {
    const gl = this.gl;
    const now = performance.now() * 0.001;

    gl.uniform1f(this.uniforms.uTime, now);
    gl.uniform2f(this.uniforms.uMouse, this.mousePos.x, this.mousePos.y);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.animationId = requestAnimationFrame(this.animate);
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    this.canvas.remove();
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IridescenceAnimation;
}
