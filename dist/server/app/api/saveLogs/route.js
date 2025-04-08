(()=>{var e={};e.id=252,e.ids=[252],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},15228:(e,r,t)=>{"use strict";t.r(r),t.d(r,{patchFetch:()=>T,routeModule:()=>c,serverHooks:()=>l,workAsyncStorage:()=>d,workUnitAsyncStorage:()=>x});var s={};t.r(s),t.d(s,{POST:()=>p});var o=t(96559),i=t(48088),n=t(37719),u=t(32190),a=t(75365);async function p(e){try{let{content:r,keyCount:t,typingTime:s,timestamp:o,windowTitle:i}=await e.json();return await a.A.query(`INSERT INTO typing_logs (content, key_count, typing_time, window_title, timestamp)
       VALUES (?, ?, ?, ?, ?)`,[r,t,s,i,new Date(o)]),u.NextResponse.json({success:!0,message:"데이터가 성공적으로 저장되었습니다."},{status:200})}catch(e){return console.error("DB 저장 오류:",e),u.NextResponse.json({success:!1,error:String(e)},{status:500})}}let c=new o.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/saveLogs/route",pathname:"/api/saveLogs",filename:"route",bundlePath:"app/api/saveLogs/route"},resolvedPagePath:"C:\\Users\\user\\Desktop\\loop\\src\\app\\api\\saveLogs\\route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:d,workUnitAsyncStorage:x,serverHooks:l}=c;function T(){return(0,n.patchFetch)({workAsyncStorage:d,workUnitAsyncStorage:x})}},19771:e=>{"use strict";e.exports=require("process")},21820:e=>{"use strict";e.exports=require("os")},27910:e=>{"use strict";e.exports=require("stream")},28303:e=>{function r(e){var r=Error("Cannot find module '"+e+"'");throw r.code="MODULE_NOT_FOUND",r}r.keys=()=>[],r.resolve=r,r.id=28303,e.exports=r},28354:e=>{"use strict";e.exports=require("util")},29021:e=>{"use strict";e.exports=require("fs")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:e=>{"use strict";e.exports=require("path")},34631:e=>{"use strict";e.exports=require("tls")},41204:e=>{"use strict";e.exports=require("string_decoder")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:e=>{"use strict";e.exports=require("crypto")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},66136:e=>{"use strict";e.exports=require("timers")},74075:e=>{"use strict";e.exports=require("zlib")},75365:(e,r,t)=>{"use strict";t.d(r,{A:()=>u,w:()=>n});var s=t(46101),o=t(97329);t.n(o)().config();let i=s.createPool({host:process.env.DB_HOST||"localhost",user:process.env.DB_USER||"root",password:process.env.DB_PASSWORD||"",database:process.env.DB_NAME||"typing_stats",waitForConnections:!0,connectionLimit:10,queueLimit:0});async function n(){try{await i.query(`
      CREATE TABLE IF NOT EXISTS typing_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content TEXT NOT NULL,
        key_count INT NOT NULL,
        typing_time INT NOT NULL,
        timestamp DATETIME NOT NULL,
        window_title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `),console.error("데이터베이스 초기화 완료")}catch(e){console.error("데이터베이스 초기화 오류:",e)}}let u=i},78335:()=>{},79428:e=>{"use strict";e.exports=require("buffer")},79551:e=>{"use strict";e.exports=require("url")},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{}};var r=require("../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[447,580,165],()=>t(15228));module.exports=s})();