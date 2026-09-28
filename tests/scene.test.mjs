import test from 'node:test';import assert from 'node:assert/strict';
import {motionRig,pose} from '../clients/motion-rig.js';import {transferBench} from '../clients/transfer-bench.js';
import {identity,translate,rotateY,rotateZ,multiply,invert,point,project,lookAt,perspective,worldBounds,rayTriangle,pickPart} from '../packages/scene/math.js';
import {box,cylinder} from '../packages/scene/primitives.js';
import {featureEdges,projectedLines} from '../packages/scene/edges.js';
import {projection,cycleEnvelope,exportPlanSvg} from '../packages/scene/projection.js';
import {validateFrame} from '../packages/runtime/validation.js';
import {chartGeometry,valueAt} from '../packages/renderers/svg-chart.js';
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('column-major composition matches expected rotated point',()=>{const m=multiply(translate(1,2,3),rotateZ(Math.PI/2)),p=point(m,[2,0,0]);near(p[0],1);near(p[1],4);near(p[2],3);});
test('matrix inverse works across many poses',()=>{for(let i=0;i<40;i++){const m=multiply(translate(i/10,-1,3),multiply(rotateY(i*.12),rotateZ(i*.05))),v=multiply(invert(m),m);v.forEach((x,k)=>near(x,identity()[k]));}});
test('singular matrix returns null',()=>assert.equal(invert(Array(16).fill(0)),null));
test('camera projection and inverse recover a world point',()=>{const m=multiply(perspective(.7,1.5,.02,100),lookAt([10,-10,7],[0,0,2])),v=[1,0,3],a=project(invert(m),project(m,v));a.forEach((x,i)=>near(x,v[i]));});
test('ray triangle hit/miss and nearest-part selection',()=>{near(rayTriangle([.2,.2,2],[0,0,-1],[0,0,0],[1,0,0],[0,1,0]),2);assert.equal(rayTriangle([2,2,2],[0,0,-1],[0,0,0],[1,0,0],[0,1,0]),null);const a={id:'low',positions:box(0,0,0,1,1,1),matrix:identity()},b={...a,id:'high',matrix:translate(0,0,2)};assert.equal(pickPart([a,b],[0,0,10],[0,0,-1]),'high');});
test('box linework excludes diagonal triangulation edges',()=>assert.equal(featureEdges(box(0,0,0,1,1,1)).length,12*6));
test('smooth round members get view-dependent silhouette edges',()=>{const p={id:'tube',positions:cylinder(1,0,4),matrix:identity()};const lines=projectedLines(p,[0,2]);assert.ok(lines.some(([a,b])=>Math.abs(b[1]-a[1])>3.9));});
for(const client of [motionRig,transferBench]){
 test(client.id+': finite stable-id geometry over complete cycle',()=>{const first=client.frame(client.defaults,0,{yaw:0,explode:0}),ids=first.parts.map(p=>p.id);for(let i=0;i<=32;i++){const f=client.frame(client.defaults,i/32,{yaw:30,explode:.2});validateFrame(f);assert.deepEqual(f.parts.map(p=>p.id),ids);const b=worldBounds(f.parts);assert.ok([...b.lo,...b.hi].every(Number.isFinite));}});
 test(client.id+': source geometry remains identical between playback frames',()=>{const a=client.frame(client.defaults,.1,{yaw:0,explode:0}),b=client.frame(client.defaults,.8,{yaw:0,explode:0});for(let i=0;i<a.parts.length;i++)assert.equal(a.parts[i].positions,b.parts[i].positions);});
 test(client.id+': three orthographic projections share entity ids and stay finite',()=>{const f=client.frame(client.defaults,.2,{yaw:0,explode:0}),env=cycleEnvelope(client,client.defaults);for(const plane of ['front','side','top']){const p=projection(f.parts,plane,720,420,env);assert.deepEqual(p.parts.map(x=>x.id),f.parts.map(x=>x.id));assert.ok(!p.parts.some(x=>/NaN|Infinity/.test(x.path)));}});
 test(client.id+': changes remain local to the client parameters',()=>{const original=JSON.stringify(client.defaults);const changed={...client.defaults,[client.parameters[0].id]:client.defaults[client.parameters[0].id]+1};client.frame(changed,.3,{yaw:0,explode:0});assert.equal(JSON.stringify(client.defaults),original);});
}
test('periodic synthetic motion closes after one cycle',()=>{const a=pose(motionRig.defaults,0),b=pose(motionRig.defaults,1);near(a.a.x,b.a.x);near(a.b.heave,b.b.heave);});
test('static export escapes text and keeps provenance',()=>{const f=motionRig.frame(motionRig.defaults,.3,{yaw:0,explode:0}),s=exportPlanSvg(f,'side',{title:'<script>alert(1)</script>'});assert.ok(!s.includes('<script>'));assert.ok(s.includes('&lt;script&gt;'));assert.ok(s.includes('SYNTHETIC_MESH_NOT_CAD'));assert.ok(s.includes('Pas un plan de fabrication'));});
test('chart data handles constant series and exact endpoints',()=>{const s={id:'x',label:'X',unit:'m',values:[2,2,2]};assert.equal(valueAt(s,0),2);assert.equal(valueAt(s,1),2);assert.ok(!/NaN|Infinity/.test(chartGeometry([s]).series[0].path));});
