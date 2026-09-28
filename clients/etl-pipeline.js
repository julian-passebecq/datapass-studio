/** Data-engineering reference client: orchestration, lakehouse transforms and BI consumption. */
import {box,identity,translate,multiply,rotateZ} from '../packages/scene/index.js';
import {validateFlowSpec} from '../packages/runtime/flow-spec.js';
import {validateCodeSpec} from '../packages/runtime/code-spec.js';

const defaults={inputRate:180,partitions:8,workers:4,shuffleMB:640,batchMinutes:5};
const parameters=[
 ['inputRate','Débit entrée','k rows/min',20,500,5,'Charge',['metrics','trace']],
 ['partitions','Partitions','',1,64,1,'Compute',['metrics','trace']],
 ['workers','Workers','',1,16,1,'Compute',['metrics','trace']],
 ['shuffleMB','Shuffle','MB',50,2400,10,'Compute',['metrics','trace']],
 ['batchMinutes','Fenêtre batch','min',1,30,1,'Orchestration',['metrics']]
].map(([id,label,unit,min,max,step,group,affects])=>({id,label,unit,min,max,step,group,affects,note:'Paramètre synthétique pour la démonstration ETL.'}));

const flowSpec=validateFlowSpec({
 format:'datapass.studio.flow',version:1,id:'etl-pipeline-flow',title:'Pipeline CSV → Airflow → Databricks → Power BI',orientation:'horizontal',sourceKind:'synthetic',
 note:'Flux de démonstration. Les nœuds décrivent une architecture; Studio ne lance aucun service externe.',
 nodes:[
  {id:'csv',label:'Local CSV',kind:'source',group:'Input',detail:'Fichier de démonstration sélectionné localement.',entityIds:['csv'],meta:{layer:'input'}},
  {id:'airflow',label:'Airflow DAG',kind:'task',group:'Orchestration',detail:'Ordonnancement ingestion + transformation.',entityIds:['airflow'],meta:{layer:'orchestration'}},
  {id:'bronze',label:'Delta Bronze',kind:'store',group:'Lakehouse',detail:'Zone brute append-only.',entityIds:['bronze'],meta:{layer:'bronze'}},
  {id:'analysis',label:'Vector analysis',kind:'transform',group:'Databricks',detail:'Transformation PySpark et calcul vectoriel synthétique.',entityIds:['analysis'],meta:{layer:'silver'}},
  {id:'gold',label:'Delta Gold',kind:'store',group:'Lakehouse',detail:'Table analytique curatée.',entityIds:['gold'],meta:{layer:'gold'}},
  {id:'semantic',label:'Power BI model',kind:'model',group:'Consumption',detail:'Modèle sémantique en étoile.',entityIds:['semantic'],meta:{layer:'semantic'}},
  {id:'report',label:'Power BI report',kind:'report',group:'Consumption',detail:'Rapport interactif de consommation.',entityIds:['report'],meta:{layer:'report'}}
 ],
 edges:[
  {id:'trigger',from:'csv',to:'airflow',kind:'control',label:'trigger'},
  {id:'ingest',from:'airflow',to:'bronze',kind:'data',label:'ingest'},
  {id:'read',from:'bronze',to:'analysis',kind:'data',label:'read'},
  {id:'write',from:'analysis',to:'gold',kind:'data',label:'write'},
  {id:'load',from:'gold',to:'semantic',kind:'data',label:'load'},
  {id:'visualize',from:'semantic',to:'report',kind:'dependency',label:''}
 ]
});

const codeSpec=validateCodeSpec({
 format:'datapass.studio.code',version:1,id:'etl-vector-code',title:'Vector analysis · PySpark',language:'python',fileLabel:'jobs/vector_analysis.py',sourceKind:'synthetic',
 note:'Extrait synthétique en lecture seule; il n’est jamais exécuté par le document Studio.',
 code:[
  'from pyspark.sql import functions as F',
  '',
  'bronze = spark.read.table("demo.bronze.measurements")',
  'gold = (bronze',
  '    .withColumn("magnitude", F.sqrt(F.col("x")**2 + F.col("y")**2))',
  '    .groupBy("asset_id")',
  '    .agg(F.avg("magnitude").alias("avg_magnitude")))',
  '',
  'gold.write.mode("overwrite").saveAsTable("demo.gold.asset_metrics")'
 ].join('\n'),
 highlights:[
  {start:3,end:3,label:'Bronze input',kind:'info'},
  {start:4,end:7,label:'Vector transform',kind:'focus'},
  {start:9,end:9,label:'Gold output',kind:'success'}
 ]
});

const artifactCatalog={documents:[{id:'etl-note',title:'Architecture ETL synthétique',mime:'application/pdf',sourceKind:'synthetic',pages:4,sourceLabel:'Fixture publique · aucun document client'}],artifacts:[
 {id:'etl-flow',title:'Flux de bout en bout',kind:'figure',documentId:'etl-note',page:1,entityIds:['csv','airflow','bronze','analysis','gold','semantic','report'],region:[.06,.18,.88,.48],preview:{plane:'top'},sourceKind:'synthetic',summary:'Repère documentaire du pipeline complet.'},
 {id:'etl-code',title:'Transformation PySpark',kind:'code',documentId:'etl-note',page:2,entityIds:['analysis'],region:[.08,.18,.84,.56],preview:{plane:'front'},sourceKind:'synthetic',summary:'Lien entre le nœud de transformation et un extrait de code inertement affiché.'},
 {id:'etl-gold',title:'Sortie analytique Gold',kind:'table',documentId:'etl-note',page:3,entityIds:['gold','semantic'],region:[.12,.25,.76,.45],preview:{plane:'side'},sourceKind:'synthetic',summary:'Sortie curatée et modèle de consommation.'}
]};

const geometry=[
 ['csv','CSV','Input',-6,0,.6,1.2,1.0,1.2,[.36,.58,.65]],
 ['airflow','Airflow','Orchestration',-4,0,.75,1.5,1.2,1.5,[.55,.47,.66]],
 ['bronze','Bronze','Lakehouse',-2,0,.65,1.45,1.25,1.3,[.52,.58,.62]],
 ['analysis','Vector analysis','Compute',0,0,.8,1.7,1.3,1.6,[.24,.57,.63]],
 ['gold','Gold','Lakehouse',2,0,.65,1.45,1.25,1.3,[.72,.57,.30]],
 ['semantic','Semantic model','BI',4,0,.7,1.45,1.2,1.4,[.42,.55,.72]],
 ['report','Report','BI',6,0,.75,1.5,1.1,1.5,[.40,.66,.47]]
].map(([id,label,group,x,y,z,w,d,h,color])=>({id,label,group,x,y,z,positions:box(0,0,0,w,d,h),color,parameterIds:[],source:'synthetic'}));

const capacity=p=>p.workers*65;
export const etlPipeline={
 id:'etl-pipeline',version:'1.0.0',title:'ETL Pipeline',description:'Airflow · Databricks · BI, même runtime Studio',classification:'synthetic',parameters,defaults,artifactCatalog,flowSpec,codeSpec,
 scenarios:[
  {id:'standard',label:'Standard',parameters:defaults},
  {id:'high-volume',label:'High volume',parameters:{...defaults,inputRate:360,partitions:16,workers:8,shuffleMB:1200,batchMinutes:3}}
 ],
 validate:p=>p.partitions<p.workers?['Le nombre de partitions doit rester supérieur ou égal au nombre de workers dans cette fixture.']:[],
 period:()=>3,
 frame(p,phase,view){
  const yaw=rotateZ(view.yaw*Math.PI/180),pulse=Math.sin(phase*2*Math.PI);
  return {units:'m',source:'SYNTHETIC_ETL_ARCHITECTURE',warnings:['Architecture et métriques synthétiques; aucun service Airflow, Databricks ou Power BI n’est exécuté.'],parts:geometry.map(part=>{
   const lift=part.id==='analysis'?.08*pulse:part.id==='airflow'?.04*Math.max(0,pulse):0;
   const spread=view.explode*(part.x/6)*.65;
   return {...part,matrix:multiply(yaw,translate(part.x+spread,part.y,part.z+lift))};
  })};
 },
 traces:p=>{
  const n=121,cap=capacity(p),through=Math.min(p.inputRate,cap),pressure=Math.max(0,p.inputRate-cap);
  return [
   {id:'throughput',label:'Throughput',unit:'k rows/min',values:Array.from({length:n},(_,i)=>through*(.92+.08*Math.sin(i/(n-1)*2*Math.PI)))},
   {id:'backlog',label:'Backlog',unit:'k rows',values:Array.from({length:n},(_,i)=>pressure*(.5+.5*Math.sin(i/(n-1)*2*Math.PI-Math.PI/2)))},
   {id:'shuffle',label:'Shuffle / partition',unit:'MB',values:Array.from({length:n},()=>p.shuffleMB/p.partitions)}
  ];
 },
 metrics:p=>{
  const cap=capacity(p),latency=p.batchMinutes+p.shuffleMB/(Math.max(1,p.workers)*420),success=Math.max(90,100-Math.max(0,p.inputRate-cap)*.04);
  return [
   {id:'capacity',label:'Capacité synthétique',value:Number(cap.toFixed(1)),unit:'k rows/min',note:'workers × capacité illustrative'},
   {id:'partition',label:'Shuffle / partition',value:Number((p.shuffleMB/p.partitions).toFixed(1)),unit:'MB',note:'Répartition simple'},
   {id:'latency',label:'Latence estimée',value:Number(latency.toFixed(2)),unit:'min',note:'Fixture de démonstration'},
   {id:'success',label:'Succès estimé',value:Number(success.toFixed(2)),unit:'%',note:'Pas un SLA réel'}
  ];
 },
 explain:[
  {title:'Orchestration',body:'Le DAG est un nœud de contrôle. La vue décrit la dépendance sans exécuter Airflow.',entityId:'airflow',phase:.12,code:'flow: csv -> airflow -> bronze'},
  {title:'Transformation',body:'Le nœud de calcul peut être relié à un extrait PySpark inertement affiché.',entityId:'analysis',phase:.45,code:'CodeView(client.codeSpec)'},
  {title:'Consommation',body:'Gold, modèle sémantique et rapport restent des entités distinctes et traçables.',entityId:'semantic',phase:.78,code:'gold -> semantic -> report'}
 ]
};
