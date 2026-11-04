// water.js — the flood, as a WebGL pass over the frame. For each pixel below
// the horizon: trace to the surface, bend the ray, find the drowned street and
// paint it through turquoise water (with caustics), then lay a smeared,
// painted reflection on top and sprinkle separate sun glints.
'use strict';
const GLW = (() => {
  const cv = canvas(W, H);
  const gl = cv.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
  if (!gl) return null;
  const vs = `#version 300 es
  in vec2 p; out vec2 uv; void main(){ uv = p*.5+.5; gl_Position = vec4(p,0,1); }`;
  const fs = `#version 300 es
  precision highp float;
  in vec2 uv; out vec4 o;
  uniform vec2 uRes; uniform vec3 cPos, cF, cR, cU; uniform float cf; uniform vec2 cc; uniform float mir;
  uniform sampler2D tG, tGH, tRefl, tSub;
  uniform vec4 gRect, hRect; uniform float uT, uTq, uDepth, uRain, uCalm, uGlit, uCaus, uSunK, uRefK, uDim;
  uniform vec3 uSun; uniform vec4 uRip[48]; uniform int nRip;
  uniform vec3 wDeep, wShal, wRefTint; uniform int uDbg;
  float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
  // height field of the surface (metres)
  float hgt(vec2 x, float lod){
    float t=uT, h=0.;
    h += .035*sin(dot(x,vec2(.31,.9))*1.3 + t*1.1);
    h += .028*sin(dot(x,vec2(-.7,.5))*1.9 + t*1.5);
    h += .018*sin(dot(x,vec2(.9,.2))*3.1 - t*1.9) * (1.-lod);
    h += .012*(vn(x*2.2+vec2(t*.3,t*.2))-.5) * (1.-lod);
    h += .008*(vn(x*5.+vec2(-t*.5,t*.4))-.5) * (1.-lod) ;
    h *= uCalm;
    // rain ripples: rings travelling out from each drop
    for(int i=0;i<48;i++){ if(i>=nRip) break; vec4 r=uRip[i]; float d=length(x-r.xy); float R=r.z*.9; float w=.06+r.z*.08;
      h += r.w*.05*exp(-r.z*1.8)*cos((d-R)*26.)*exp(-(d-R)*(d-R)/(w*w)); }
    // fine rain stipple
    h += uRain*.006*(vn(x*14.+vec2(uTq*37.,uTq*11.))-.5);
    return h;
  }
  vec3 nrm(vec2 x, float lod){ float e=.03+lod*.2; float a=hgt(x,lod); return normalize(vec3(-(hgt(x+vec2(e,0),lod)-a)/e, 1., -(hgt(x+vec2(0,e),lod)-a)/e)); }
  vec2 h22(vec2 p){ vec3 a = fract(vec3(p.xyx)*vec3(123.34,234.34,345.65)); a += dot(a, a+34.45); return fract(vec2(a.x*a.y, a.y*a.z)); }
  // caustic net: the edges of moving Voronoi cells, drawn as crisp bright lines
  float caustic(vec2 p, float t){
    p += .35*vec2(sin(p.y*1.7 + t*.9), cos(p.x*1.5 - t*.7)) + .25*vec2(vn(p*2.3+t*.2), vn(p*2.1-t*.25));
    vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
    for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++){ vec2 g = vec2(x,y); vec2 h = h22(i+g); vec2 c = g + .5 + .38*sin(t*1.3 + 6.2831*h) - f; float d = dot(c,c);
      if (d<d1){ d2=d1; d1=d; } else if (d<d2) d2=d; }
    float e = sqrt(d2) - sqrt(d1);
    float w = fwidth(e)*1.2 + .01;
    float bright = .55 + .45*vn(p*.8 + t*.3);
    return (1. - smoothstep(.015, .015 + w + .05, e)) * bright;
  }
  vec3 ground(vec3 G){
    vec2 q = G.xz; vec3 c;
    vec2 uh = (q - hRect.xy)/(hRect.zw-hRect.xy);
    if (uh.x>0.&&uh.y>0.&&uh.x<1.&&uh.y<1.) c = texture(tGH, uh, .8).rgb;
    else c = texture(tG, (q - gRect.xy)/(gRect.zw-gRect.xy), .5).rgb;
    return c;
  }
  void main(){
    vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
    vec3 d = normalize(cF + cR*((fc.x-cc.x)/cf) - cU*((fc.y-cc.y)/cf));
    if (d.y > -.0004) { o = vec4(0); return; }
    float t = -cPos.y/d.y; vec3 P = cPos + d*t;
    float lod = clamp(t/120., 0., 1.);
    vec3 n = nrm(P.xz, lod);
    // a gentler normal for refraction so the street stays readable
    vec3 nr = normalize(mix(vec3(0,1,0), n, .3));
    vec3 dr = refract(d, nr, 1./1.33);
    float tg = (-uDepth - P.y)/dr.y; vec3 G = P + dr*tg;
    // building walls at the avenue edges swallow the ray
    vec3 under; float path = tg;
    float wallX = (G.z < -2.5 || G.z > 22.) ? 13.9 : 26.;
    bool wall = abs(G.x) > wallX && abs(P.x) < wallX;
    if (wall) { float tw = (sign(dr.x)*wallX - P.x)/dr.x; vec3 Wp = P + dr*tw; path = tw;
      float win = step(.5, fract(Wp.z*.28))*step(-2.6, Wp.y)*step(Wp.y, -1.); under = mix(vec3(.55,.62,.62), vec3(.2,.32,.45), win*.8); }
    else under = ground(G);
    if (uDbg==1) { o = vec4(under,1.); return; }
    // caustics dance on the bottom (stepped on threes)
    float cz = caustic(G.xz*.9 + vec2(.0, uTq*.05), uTq*1.1);
    float cz2 = caustic(G.xz*1.7 + vec2(3.1,1.7), uTq*1.4 + 11.);
    float cs = (cz*.6 + cz2*.28) * (1. - smoothstep(30., 90., tg + t*.5));
    under += vec3(1.,.98,.85)*cs*uCaus*(1.-uDim*.7)*(wall?.35:1.);
    if (uDbg==2) { o = vec4(under,1.); return; }
    // submerged things (robot legs, fish), drawn by the 2D pass
    vec2 suv = (fc + n.xz*vec2(18.,10.)*(1.-lod))/uRes;
    vec4 sb = texture(tSub, suv);
    float midPath = max(1.2, path*.45);
    // absorption + in-scatter: clear turquoise
    vec3 k = vec3(.17,.05,.045);
    vec3 Tg = exp(-k*path), Ts = exp(-k*midPath);
    vec3 scat = mix(wShal, wDeep, clamp(path/18.,0.,1.));
    vec3 colG = under*Tg + scat*(1.-Tg);
    vec3 colS = sb.rgb/max(sb.a,.001)*Ts + scat*(1.-Ts);
    vec3 col = mix(colG, colS, sb.a);
    // distance: the water body itself takes over
    col = mix(col, wDeep*1.03, clamp((t-25.)/160., 0., .85));
    // reflection, smeared down like painted water
    float cosi = clamp(-dot(d,n), 0., 1.);
    float F = .02 + .98*pow(1.-cosi, 5.);
    F = clamp(F*.95 + .12*lod, 0., .9) * uRefK;
    vec2 ruv = fc + vec2(n.x*240., n.z*60.)*(1.-lod*.8) / (1. + t*.04);
    vec3 refl = vec3(0.); float wsum = 0.;
    for (int i=0;i<7;i++){ float k2 = float(i)/6.; vec2 u = (ruv + vec2(0., k2*k2*28.*(1.-lod*.6)))/uRes; float wt = 1.-k2*.6; refl += texture(tRefl, u).rgb*wt; wsum += wt; }
    refl /= wsum;
    refl = mix(refl, refl*wRefTint, .35);
    col = mix(col, refl, F);
    // painted highlight streaks on wave faces turned to the sky
    float face = dot(n, normalize(vec3(-.2, 1., .9)));
    float streak = smoothstep(.9965, .9985, face) * (1.-lod) * smoothstep(.2,.8,vn(P.xz*vec2(.6,2.4)+uTq*.2));
    col = mix(col, vec3(.93,.99,1.), streak*.55*(1.-uDim*.5));
    // sun glints: separate sparkles along the glitter path
    vec3 rr = reflect(d, n);
    float s = max(dot(rr, uSun), 0.);
    float cell = h21(floor(P.xz*vec2(3.,1.2)) + floor(uTq*8.));
    float gl = pow(s, 900.) * step(.55, cell) * 6. + pow(s, 120.)*.25;
    col += vec3(1.,.98,.9)*gl*uGlit*uSunK;
    o = vec4(col, 1.);
  }`;
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const texs = {};
  function tex(unit, name, src, keep) {
    let t = texs[name];
    if (!t) { t = texs[name] = gl.createTexture(); }
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    if (!keep || !t.loaded) {
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      t.loaded = true;
    }
    gl.uniform1i(U(name), unit);
  }
  let groundCv = null, hiCv = null;
  return {
    cv,
    // o: {cam, refl (canvas), sub (canvas), t, tq, rain, ripples:[[x,z,age,str]], glit, caus, sunK, dim, refK, calm}
    render(o) {
      if (!groundCv) { groundCv = paintStreet(GROUND, false); hiCv = paintStreet(GHI, true); }
      const c = o.cam;
      gl.viewport(0, 0, W, H);
      gl.uniform2f(U('uRes'), W, H);
      gl.uniform3fv(U('cPos'), c.pos); gl.uniform3fv(U('cF'), c.fwd); gl.uniform3fv(U('cR'), c.right); gl.uniform3fv(U('cU'), c.up);
      gl.uniform1f(U('cf'), c.f); gl.uniform2f(U('cc'), c.cx, c.cy);
      tex(0, 'tG', groundCv, true); tex(1, 'tGH', hiCv, true); tex(2, 'tRefl', o.refl); tex(3, 'tSub', o.sub);
      gl.uniform4f(U('gRect'), GROUND.x0, GROUND.z0, GROUND.x1, GROUND.z1); gl.uniform4f(U('hRect'), GHI.x0, GHI.z0, GHI.x1, GHI.z1);
      gl.uniform1f(U('uT'), o.t); gl.uniform1f(U('uTq'), o.tq === undefined ? Math.floor(o.t * 8) / 8 : o.tq);
      gl.uniform1f(U('uDepth'), -STREET_Y); gl.uniform1f(U('uRain'), o.rain || 0); gl.uniform1f(U('uCalm'), o.calm === undefined ? 1 : o.calm);
      gl.uniform1f(U('uGlit'), o.glit === undefined ? 1 : o.glit); gl.uniform1f(U('uCaus'), o.caus === undefined ? .55 : o.caus);
      gl.uniform1f(U('uSunK'), o.sunK === undefined ? 1 : o.sunK); gl.uniform1f(U('uRefK'), o.refK === undefined ? 1 : o.refK); gl.uniform1f(U('uDim'), o.dim || 0);
      gl.uniform3fv(U('uSun'), SUN);
      const rp = new Float32Array(48 * 4); const rs = (o.ripples || []).slice(0, 48);
      rs.forEach((r, i) => rp.set(r, i * 4)); gl.uniform4fv(U('uRip'), rp); gl.uniform1i(U('nRip'), rs.length);
      gl.uniform3fv(U('wDeep'), o.deep || [.12, .5, .62]); gl.uniform3fv(U('wShal'), o.shal || [.2, .66, .7]); gl.uniform3fv(U('wRefTint'), [.75, 1., 1.]);
      gl.uniform1i(U('uDbg'), window.WDBG || 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return cv;
    },
  };
})();
