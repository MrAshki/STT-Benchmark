import React, {useEffect, useRef, useState} from "react";
import "./robot-icon.css";

// Procedural, rounded geometry. No remote renderer, model, or texture is required.
function roundedBox(w, h, d, r, n = 8) {
  const positions = [], normals = [];
  const halves = [w / 2, h / 2, d / 2];
  const point = (axis, sign, u, v) => {
    const p = [0, 0, 0], a = (axis + 1) % 3, b = (axis + 2) % 3;
    p[axis] = sign * halves[axis]; p[a] = u * halves[a]; p[b] = v * halves[b];
    const radius = halves.map(half => Math.min(r, half));
    const q = p.map((x, i) => Math.max(-halves[i] + radius[i], Math.min(halves[i] - radius[i], x)));
    const delta = p.map((x, i) => (x - q[i]) / radius[i]);
    const length = Math.hypot(...delta);
    const normal = delta.map((x, i) => x / radius[i]);
    const normalLength = Math.hypot(...normal);
    return [q.map((x, i) => x + delta[i] / length * radius[i]), normal.map(x => x / normalLength)];
  };
  for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const corners = [[i,j],[i+1,j],[i+1,j+1],[i,j+1]].map(([u,v]) => point(axis, sign, u/n*2-1, v/n*2-1));
      for (const index of (sign > 0 ? [0,1,2,0,2,3] : [0,2,1,0,3,2])) {
        positions.push(...corners[index][0]); normals.push(...corners[index][1]);
      }
    }
  }
  return {positions, normals};
}
const mul = (a,b) => Array.from({length:16},(_,i) => {const r=i%4,c=Math.floor(i/4); return a[r]*b[c*4]+a[r+4]*b[c*4+1]+a[r+8]*b[c*4+2]+a[r+12]*b[c*4+3];});
const identity = () => [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const translate = (x,y,z) => [1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1];
const yaw = a => [Math.cos(a),0,-Math.sin(a),0,0,1,0,0,Math.sin(a),0,Math.cos(a),0,0,0,0,1];
const pitch = a => [1,0,0,0,0,Math.cos(a),Math.sin(a),0,0,-Math.sin(a),Math.cos(a),0,0,0,0,1];

export function RobotIcon({size = 52}) {
  const canvasRef = useRef(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl", {alpha:true, antialias:true, premultipliedAlpha:false});
    if (!gl) {setFallback(true); return;}
    let frame = 0, disposed = false, visible = true;
    const buffers = [], shaders = [];
    const compile = (type, source) => {const s=gl.createShader(type); shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error("Robot shader could not start");return s;};
    let program;
    try {
      program=gl.createProgram();
      gl.attachShader(program,compile(gl.VERTEX_SHADER,`attribute vec3 position; attribute vec3 normal; uniform mat4 model; uniform mat4 projection; varying vec3 N; varying vec3 P; void main(){vec4 p=model*vec4(position,1.); P=p.xyz; N=mat3(model)*normal; gl_Position=projection*p;}`));
      gl.attachShader(program,compile(gl.FRAGMENT_SHADER,`precision mediump float; varying vec3 N; varying vec3 P; uniform vec3 color; uniform float glow; void main(){vec3 n=normalize(N); vec3 light=normalize(vec3(-2.,3.,5.)); vec3 view=normalize(-P); float diffuse=max(dot(n,light),0.);float shine=pow(max(dot(n,normalize(light+view)),0.),35.);float rim=pow(1.-max(dot(n,view),0.),2.);vec3 lit=color*(.35+.7*diffuse)+vec3(.36,.4,.68)*shine+vec3(.12,.08,.24)*rim;gl_FragColor=vec4(mix(lit,color*1.2,glow),1.);}`));
      gl.linkProgram(program); if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error("Robot renderer could not start");
      gl.useProgram(program);
      const loc={position:gl.getAttribLocation(program,"position"),normal:gl.getAttribLocation(program,"normal"),model:gl.getUniformLocation(program,"model"),projection:gl.getUniformLocation(program,"projection"),color:gl.getUniformLocation(program,"color"),glow:gl.getUniformLocation(program,"glow")};
      const dark=[.055,.055,.12], edge=[.17,.18,.32], face=[.018,.018,.045], pink=[1,.08,.65];
      const parts=[];
      const part=(dimensions,r,at,color,head=false,glow=0)=>{
        const geometry=roundedBox(...dimensions,r), buffer=gl.createBuffer(); buffers.push(buffer);
        const interleaved=[];for(let i=0;i<geometry.positions.length;i+=3)interleaved.push(...geometry.positions.slice(i,i+3),...geometry.normals.slice(i,i+3));
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(interleaved),gl.STATIC_DRAW);
        parts.push({buffer,count:geometry.positions.length/3,at,color,head,glow});
      };
      part([1.48,1.12,.9],.23,[0,.32,0],edge,true);
      part([1.28,.91,.12],.19,[0,.32,.46],dark,true);
      part([1.12,.75,.08],.17,[0,.32,.54],face,true);
      for(const x of [-.29,.29]){
        part([.41,.27,.05],.115,[x,.39,.596],pink,true,1);
        part([.29,.105,.055],.045,[x,.43,.614],[1,.83,.97],true,1);
        part([.14,.18,.18],.065,[x*1.6,.94,-.06],edge,true);
      }
      part([1.05,.66,.72],.17,[0,-.59,-.06],dark);
      part([.72,.12,.12],.055,[0,-.4,.32],edge);
      for(const x of [-.66,.66])part([.25,.55,.3],.12,[x,-.57,.04],edge);
      for(const x of [-.33,.33])part([.29,.22,.38],.1,[x,-.98,.06],dark);
      gl.enable(gl.DEPTH_TEST); gl.clearColor(0,0,0,0);
      const media=window.matchMedia("(prefers-reduced-motion: reduce)");
      const start=performance.now();
      const draw=now=>{
        if(disposed)return;
        if(visible){
          const rect=canvas.getBoundingClientRect(), ratio=Math.min(window.devicePixelRatio||1,2);
          const width=Math.max(1,Math.round(rect.width*ratio)),height=Math.max(1,Math.round(rect.height*ratio));
          if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
          gl.viewport(0,0,width,height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
          const f=1/Math.tan(.52/2),aspect=width/height,near=.1,far=20;
          gl.uniformMatrix4fv(loc.projection,false,new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]));
          const t=(now-start)/1000, angle=media.matches?-.12:Math.sin(t*.75)*.48;
          const base=mul(translate(0,media.matches?0:Math.sin(t*1.4)*.025,-5.1),pitch(.08));
          for(const p of parts){
            const group=p.head?mul(translate(0,.1,0),mul(yaw(angle),translate(0,-.1,0))):yaw(-.08);
            const model=mul(base,mul(group,translate(...p.at)));
            gl.bindBuffer(gl.ARRAY_BUFFER,p.buffer);gl.enableVertexAttribArray(loc.position);gl.enableVertexAttribArray(loc.normal);
            gl.vertexAttribPointer(loc.position,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,24,12);
            gl.uniformMatrix4fv(loc.model,false,new Float32Array(model));gl.uniform3fv(loc.color,p.color);gl.uniform1f(loc.glow,p.glow);gl.drawArrays(gl.TRIANGLES,0,p.count);
          }
        }
        // A static frame is sufficient when the user requests reduced motion.
        if(!media.matches&&visible)frame=requestAnimationFrame(draw);
      };
      const restart=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);};
      const observer=typeof IntersectionObserver!=="undefined"?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;restart();}):null;
      observer?.observe(canvas);media.addEventListener("change",restart);
      const resize=new ResizeObserver(restart);resize.observe(canvas);
      const visibility=()=>{visible=!document.hidden;restart();};document.addEventListener("visibilitychange",visibility);
      frame=requestAnimationFrame(draw);
      const lost=event=>{event.preventDefault();setFallback(true);cancelAnimationFrame(frame);};canvas.addEventListener("webglcontextlost",lost);
      return()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();resize.disconnect();media.removeEventListener("change",restart);document.removeEventListener("visibilitychange",visibility);canvas.removeEventListener("webglcontextlost",lost);buffers.forEach(b=>gl.deleteBuffer(b));shaders.forEach(s=>gl.deleteShader(s));gl.deleteProgram(program);};
    }catch{setFallback(true);buffers.forEach(b=>gl.deleteBuffer(b));shaders.forEach(s=>gl.deleteShader(s));if(program)gl.deleteProgram(program);}
  },[]);
  return <span className="stt-robot-icon" style={{width:size,height:size}} aria-hidden="true">{fallback?<span className="stt-robot-fallback"><i/><i/></span>:<canvas ref={canvasRef}/>}</span>;
}
export default RobotIcon;
