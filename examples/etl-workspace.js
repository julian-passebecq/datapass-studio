import {validateFlowSpec} from '../packages/runtime/flow-spec.js';
import {validateCodeSpec} from '../packages/runtime/code-spec.js';
import {validateLayoutDocument} from '../packages/runtime/layout.js';

export const etlFlow=validateFlowSpec({
 format:'datapass.studio.flow',version:1,id:'etl-lakehouse',title:'CSV → orchestration → lakehouse → BI',orientation:'horizontal',sourceKind:'synthetic',
 note:'Architecture example only. It does not run Airflow, Databricks or Power BI.',
 nodes:[
  {id:'csv',label:'Local CSV',kind:'source',group:'Input',detail:'User-selected local fixture',entityIds:[],meta:{}},
  {id:'airflow',label:'Airflow DAG',kind:'task',group:'Orchestration',detail:'Schedules ingestion and analysis tasks',entityIds:[],meta:{}},
  {id:'bronze',label:'Delta Bronze',kind:'store',group:'Databricks',detail:'Raw append-only landing',entityIds:[],meta:{}},
  {id:'analysis',label:'Vector analysis',kind:'transform',group:'Databricks',detail:'PySpark transform / vector calculation',entityIds:[],meta:{}},
  {id:'gold',label:'Delta Gold',kind:'store',group:'Databricks',detail:'Curated analytical table',entityIds:[],meta:{}},
  {id:'semantic',label:'Power BI model',kind:'model',group:'Consumption',detail:'Star-model semantic layer',entityIds:[],meta:{}},
  {id:'report',label:'Power BI report',kind:'report',group:'Consumption',detail:'Interactive analytical report',entityIds:[],meta:{}}
 ],
 edges:[
  {id:'ingest',from:'csv',to:'airflow',kind:'control',label:'trigger'},
  {id:'land',from:'airflow',to:'bronze',kind:'data',label:'ingest'},
  {id:'compute',from:'bronze',to:'analysis',kind:'data',label:'read'},
  {id:'curate',from:'analysis',to:'gold',kind:'data',label:'write'},
  {id:'model',from:'gold',to:'semantic',kind:'data',label:'load'},
  {id:'visualize',from:'semantic',to:'report',kind:'dependency',label:''}
 ]
});

export const analysisCode=validateCodeSpec({
 format:'datapass.studio.code',version:1,id:'vector-job',title:'Synthetic PySpark transform',language:'python',fileLabel:'jobs/vector_analysis.py',sourceKind:'synthetic',
 note:'Fixture for a Studio code panel. It is never executed by the manifest or renderer.',
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

export const etlLayout=validateLayoutDocument({
 format:'datapass.studio.layout',version:1,id:'etl-review',title:'ETL review',
 root:{id:'root',kind:'split',axis:'vertical',ratio:.58,resizable:true,first:{id:'flow-slot',kind:'slot',slot:'flow',label:'Architecture'},second:{id:'code-slot',kind:'slot',slot:'code',label:'Code'}}
});
