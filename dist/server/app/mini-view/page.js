(()=>{var e={};e.id=950,e.ids=[950],e.modules={3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},4353:(e,t,s)=>{Promise.resolve().then(s.bind(s,22288))},9071:(e,t,s)=>{"use strict";s.r(t),s.d(t,{GlobalError:()=>o.a,__next_app__:()=>u,pages:()=>d,routeModule:()=>p,tree:()=>c});var n=s(65239),i=s(48088),r=s(88170),o=s.n(r),a=s(30893),l={};for(let e in a)0>["default","tree","pages","GlobalError","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>a[e]);s.d(t,l);let c={children:["",{children:["mini-view",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(s.bind(s,28052)),"C:\\Users\\user\\Desktop\\loop_2\\src\\app\\mini-view\\page.tsx"]}]},{metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,70440))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(s.bind(s,94431)),"C:\\Users\\user\\Desktop\\loop_2\\src\\app\\layout.tsx"],"not-found":[()=>Promise.resolve().then(s.t.bind(s,57398,23)),"next/dist/client/components/not-found-error"],forbidden:[()=>Promise.resolve().then(s.t.bind(s,89999,23)),"next/dist/client/components/forbidden-error"],unauthorized:[()=>Promise.resolve().then(s.t.bind(s,65284,23)),"next/dist/client/components/unauthorized-error"],metadata:{icon:[async e=>(await Promise.resolve().then(s.bind(s,70440))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]}.children,d=["C:\\Users\\user\\Desktop\\loop_2\\src\\app\\mini-view\\page.tsx"],u={require:s,loadChunk:()=>Promise.resolve()},p=new n.AppPageRouteModule({definition:{kind:i.RouteKind.APP_PAGE,page:"/mini-view/page",pathname:"/mini-view",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},18627:(e,t,s)=>{Promise.resolve().then(s.t.bind(s,16444,23)),Promise.resolve().then(s.t.bind(s,16042,23)),Promise.resolve().then(s.t.bind(s,88170,23)),Promise.resolve().then(s.t.bind(s,49477,23)),Promise.resolve().then(s.t.bind(s,29345,23)),Promise.resolve().then(s.t.bind(s,12089,23)),Promise.resolve().then(s.t.bind(s,46577,23)),Promise.resolve().then(s.t.bind(s,31307,23))},19121:e=>{"use strict";e.exports=require("next/dist/server/app-render/action-async-storage.external.js")},22288:(e,t,s)=>{"use strict";s.d(t,{default:()=>r});var n=s(60687),i=s(43210);function r({children:e}){let[t,s]=(0,i.useState)(!1),[r,o]=(0,i.useState)(!1);return t&&(r?document.documentElement.classList.add("dark-mode"):document.documentElement.classList.remove("dark-mode")),(0,n.jsx)(n.Fragment,{children:e})}},23824:(e,t,s)=>{Promise.resolve().then(s.bind(s,28052))},28052:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>i,dynamic:()=>r});var n=s(12907);let i=(0,n.registerClientReference)(function(){throw Error("Attempted to call the default export of \"C:\\\\Users\\\\user\\\\Desktop\\\\loop_2\\\\src\\\\app\\\\mini-view\\\\page.tsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"C:\\Users\\user\\Desktop\\loop_2\\src\\app\\mini-view\\page.tsx","default"),r=(0,n.registerClientReference)(function(){throw Error("Attempted to call dynamic() from the server but dynamic is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"C:\\Users\\user\\Desktop\\loop_2\\src\\app\\mini-view\\page.tsx","dynamic")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},31935:(e,t,s)=>{"use strict";s.d(t,{t:()=>c,d:()=>d});var n=s(60687),i=s(43210),r=s(94588),o=s.n(r);function a({message:e,type:t,duration:s=3e3,onClose:r}){let[a,l]=(0,i.useState)(!0);return a?(0,n.jsx)("div",{className:`${o().toast} ${o()[t]}`,children:(0,n.jsx)("span",{className:o().message,children:e})}):null}let l=(0,i.createContext)(void 0);function c({children:e}){let[t,s]=(0,i.useState)(null);return(0,n.jsxs)(l.Provider,{value:{showToast:(e,t)=>{s({message:e,type:t}),setTimeout(()=>{s(null)},3e3)}},children:[e,t&&(0,n.jsx)(a,{message:t.message,type:t.type,onClose:()=>s(null)})]})}let d=()=>{let e=(0,i.useContext)(l);return void 0===e?{showToast:(e,t)=>{console.warn("ToastProvider가 설정되지 않았습니다:",e)}}:e}},33552:(e,t,s)=>{Promise.resolve().then(s.bind(s,34236))},33873:e=>{"use strict";e.exports=require("path")},34236:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>u,dynamic:()=>p});var n=s(60687),i=s(76180),r=s.n(i),o=s(43210),a=s(35185),l=s.n(a);function c(){let[e,t]=(0,o.useState)(!1),[s,i]=(0,o.useState)({keyCount:0,typingTime:0,windowTitle:"",browserName:"",totalChars:0,totalWords:0,accuracy:100,isTracking:!1});return e?(0,n.jsxs)("div",{className:l().miniView,children:[(0,n.jsx)("div",{className:l().appIconWrapper,children:(0,n.jsx)("img",{src:"/app-icon.svg",alt:"앱 아이콘",className:l().appIcon,onClick:()=>t(!1)})}),(0,n.jsxs)("div",{className:l().content,children:[(0,n.jsxs)("div",{className:l().statsContainer,children:[(0,n.jsxs)("div",{className:l().statItem,children:[(0,n.jsx)("span",{className:l().statLabel,children:"타자 수"}),(0,n.jsx)("span",{className:l().statValue,children:s.keyCount.toLocaleString()})]}),(0,n.jsxs)("div",{className:l().statItem,children:[(0,n.jsx)("span",{className:l().statLabel,children:"타이핑 시간"}),(0,n.jsxs)("span",{className:l().statValue,children:[s.typingTime,"초"]})]}),(0,n.jsxs)("div",{className:l().statItem,children:[(0,n.jsx)("span",{className:l().statLabel,children:"평균 속도"}),(0,n.jsxs)("span",{className:l().statValue,children:[s.typingTime>0?Math.round(s.keyCount/s.typingTime*60):0," 타/분"]})]}),s.accuracy&&(0,n.jsxs)("div",{className:l().statItem,children:[(0,n.jsx)("span",{className:l().statLabel,children:"정확도"}),(0,n.jsxs)("span",{className:l().statValue,children:[s.accuracy,"%"]})]})]}),s.windowTitle&&(0,n.jsx)("div",{className:l().currentWindow,children:s.windowTitle})]})]}):(0,n.jsx)("div",{className:l().miniViewCollapsed,"aria-label":"타이핑 통계 드래그",style:{WebkitAppRegion:"drag",cursor:"move",border:"none",outline:"none",boxShadow:"none"},children:(0,n.jsx)("img",{src:"/app-icon.svg",alt:"앱 아이콘",className:l().appIcon,style:{pointerEvents:"none",WebkitAppRegion:"drag",border:"none",outline:"none"}})})}var d=s(31935);function u(){return(0,n.jsx)(d.t,{children:(0,n.jsxs)("div",{style:{width:"100vw",height:"100vh",overflow:"hidden",padding:0,margin:0,outline:"none",border:"none",WebkitUserSelect:"none",WebkitAppRegion:"drag"},className:"jsx-d8f885bbe9cad636",children:[(0,n.jsx)(r(),{id:"d8f885bbe9cad636",children:"*{outline:none!important;-webkit-tap-highlight-color:transparent!important;border:none!important}body,html{-webkit-app-region:drag!important}button,img{border:none!important;outline:none!important;pointer-events:none!important}"}),(0,n.jsx)(c,{})]})})}let p="force-dynamic"},35185:e=>{e.exports={miniView:"MiniView_miniView__z133_",darkMode:"MiniView_darkMode__SXJ8A",header:"MiniView_header__2qV81",tabs:"MiniView_tabs__r135j",tabButton:"MiniView_tabButton___GcRe",activeTab:"MiniView_activeTab__Auwd_",controls:"MiniView_controls__ESkeI",closeButton:"MiniView_closeButton__dqpuD",content:"MiniView_content__U1Fpy",statsContainer:"MiniView_statsContainer__LcHqT",statItem:"MiniView_statItem__xrdQe",statLabel:"MiniView_statLabel__gzoaF",statValue:"MiniView_statValue__dDC3v",currentWindow:"MiniView_currentWindow__yUcfs",statusIndicator:"MiniView_statusIndicator__wFPdA",indicator:"MiniView_indicator__9ceg7",active:"MiniView_active__NHCxr",pulse:"MiniView_pulse__DTgET",miniViewCollapsed:"MiniView_miniViewCollapsed__Rzuk8",appIconWrapper:"MiniView_appIconWrapper__7b9Qj",appIcon:"MiniView_appIcon__BaWzJ",collapseButton:"MiniView_collapseButton__RbA_D"}},56397:()=>{},60534:(e,t,s)=>{"use strict";s.d(t,{default:()=>n});let n=(0,s(12907).registerClientReference)(function(){throw Error("Attempted to call the default export of \"C:\\\\Users\\\\user\\\\Desktop\\\\loop_2\\\\src\\\\app\\\\ClientLayout.tsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"C:\\Users\\user\\Desktop\\loop_2\\src\\app\\ClientLayout.tsx","default")},61135:()=>{},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},70440:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>i});var n=s(31658);let i=async e=>[{type:"image/x-icon",sizes:"16x16",url:(0,n.fillMetadataSegment)(".",await e.params,"favicon.ico")+""}]},75913:(e,t,s)=>{"use strict";s(56397);var n=s(43210),i=function(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}(n),r="undefined"!=typeof process&&process.env&&!0,o=function(e){return"[object String]"===Object.prototype.toString.call(e)},a=function(){function e(e){var t=void 0===e?{}:e,s=t.name,n=void 0===s?"stylesheet":s,i=t.optimizeForSpeed,a=void 0===i?r:i;l(o(n),"`name` must be a string"),this._name=n,this._deletedRulePlaceholder="#"+n+"-deleted-rule____{}",l("boolean"==typeof a,"`optimizeForSpeed` must be a boolean"),this._optimizeForSpeed=a,this._serverSheet=void 0,this._tags=[],this._injected=!1,this._rulesCount=0,this._nonce=null}var t=e.prototype;return t.setOptimizeForSpeed=function(e){l("boolean"==typeof e,"`setOptimizeForSpeed` accepts a boolean"),l(0===this._rulesCount,"optimizeForSpeed cannot be when rules have already been inserted"),this.flush(),this._optimizeForSpeed=e,this.inject()},t.isOptimizeForSpeed=function(){return this._optimizeForSpeed},t.inject=function(){var e=this;l(!this._injected,"sheet already injected"),this._injected=!0,this._serverSheet={cssRules:[],insertRule:function(t,s){return"number"==typeof s?e._serverSheet.cssRules[s]={cssText:t}:e._serverSheet.cssRules.push({cssText:t}),s},deleteRule:function(t){e._serverSheet.cssRules[t]=null}}},t.getSheetForTag=function(e){if(e.sheet)return e.sheet;for(var t=0;t<document.styleSheets.length;t++)if(document.styleSheets[t].ownerNode===e)return document.styleSheets[t]},t.getSheet=function(){return this.getSheetForTag(this._tags[this._tags.length-1])},t.insertRule=function(e,t){return l(o(e),"`insertRule` accepts only strings"),"number"!=typeof t&&(t=this._serverSheet.cssRules.length),this._serverSheet.insertRule(e,t),this._rulesCount++},t.replaceRule=function(e,t){this._optimizeForSpeed;var s=this._serverSheet;if(t.trim()||(t=this._deletedRulePlaceholder),!s.cssRules[e])return e;s.deleteRule(e);try{s.insertRule(t,e)}catch(n){r||console.warn("StyleSheet: illegal rule: \n\n"+t+"\n\nSee https://stackoverflow.com/q/20007992 for more info"),s.insertRule(this._deletedRulePlaceholder,e)}return e},t.deleteRule=function(e){this._serverSheet.deleteRule(e)},t.flush=function(){this._injected=!1,this._rulesCount=0,this._serverSheet.cssRules=[]},t.cssRules=function(){return this._serverSheet.cssRules},t.makeStyleTag=function(e,t,s){t&&l(o(t),"makeStyleTag accepts only strings as second parameter");var n=document.createElement("style");this._nonce&&n.setAttribute("nonce",this._nonce),n.type="text/css",n.setAttribute("data-"+e,""),t&&n.appendChild(document.createTextNode(t));var i=document.head||document.getElementsByTagName("head")[0];return s?i.insertBefore(n,s):i.appendChild(n),n},function(e,t){for(var s=0;s<t.length;s++){var n=t[s];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}(e.prototype,[{key:"length",get:function(){return this._rulesCount}}]),e}();function l(e,t){if(!e)throw Error("StyleSheet: "+t+".")}var c=function(e){for(var t=5381,s=e.length;s;)t=33*t^e.charCodeAt(--s);return t>>>0},d={};function u(e,t){if(!t)return"jsx-"+e;var s=String(t),n=e+s;return d[n]||(d[n]="jsx-"+c(e+"-"+s)),d[n]}function p(e,t){var s=e+(t=t.replace(/\/style/gi,"\\/style"));return d[s]||(d[s]=t.replace(/__jsx-style-dynamic-selector/g,e)),d[s]}var h=function(){function e(e){var t=void 0===e?{}:e,s=t.styleSheet,n=void 0===s?null:s,i=t.optimizeForSpeed,r=void 0!==i&&i;this._sheet=n||new a({name:"styled-jsx",optimizeForSpeed:r}),this._sheet.inject(),n&&"boolean"==typeof r&&(this._sheet.setOptimizeForSpeed(r),this._optimizeForSpeed=this._sheet.isOptimizeForSpeed()),this._fromServer=void 0,this._indices={},this._instancesCounts={}}var t=e.prototype;return t.add=function(e){var t=this;void 0===this._optimizeForSpeed&&(this._optimizeForSpeed=Array.isArray(e.children),this._sheet.setOptimizeForSpeed(this._optimizeForSpeed),this._optimizeForSpeed=this._sheet.isOptimizeForSpeed());var s=this.getIdAndRules(e),n=s.styleId,i=s.rules;if(n in this._instancesCounts){this._instancesCounts[n]+=1;return}var r=i.map(function(e){return t._sheet.insertRule(e)}).filter(function(e){return -1!==e});this._indices[n]=r,this._instancesCounts[n]=1},t.remove=function(e){var t=this,s=this.getIdAndRules(e).styleId;if(function(e,t){if(!e)throw Error("StyleSheetRegistry: "+t+".")}(s in this._instancesCounts,"styleId: `"+s+"` not found"),this._instancesCounts[s]-=1,this._instancesCounts[s]<1){var n=this._fromServer&&this._fromServer[s];n?(n.parentNode.removeChild(n),delete this._fromServer[s]):(this._indices[s].forEach(function(e){return t._sheet.deleteRule(e)}),delete this._indices[s]),delete this._instancesCounts[s]}},t.update=function(e,t){this.add(t),this.remove(e)},t.flush=function(){this._sheet.flush(),this._sheet.inject(),this._fromServer=void 0,this._indices={},this._instancesCounts={}},t.cssRules=function(){var e=this,t=this._fromServer?Object.keys(this._fromServer).map(function(t){return[t,e._fromServer[t]]}):[],s=this._sheet.cssRules();return t.concat(Object.keys(this._indices).map(function(t){return[t,e._indices[t].map(function(e){return s[e].cssText}).join(e._optimizeForSpeed?"":"\n")]}).filter(function(e){return!!e[1]}))},t.styles=function(e){var t,s;return t=this.cssRules(),void 0===(s=e)&&(s={}),t.map(function(e){var t=e[0],n=e[1];return i.default.createElement("style",{id:"__"+t,key:"__"+t,nonce:s.nonce?s.nonce:void 0,dangerouslySetInnerHTML:{__html:n}})})},t.getIdAndRules=function(e){var t=e.children,s=e.dynamic,n=e.id;if(s){var i=u(n,s);return{styleId:i,rules:Array.isArray(t)?t.map(function(e){return p(i,e)}):[p(i,t)]}}return{styleId:u(n),rules:Array.isArray(t)?t:[t]}},t.selectFromServer=function(){return Array.prototype.slice.call(document.querySelectorAll('[id^="__jsx-"]')).reduce(function(e,t){return e[t.id.slice(2)]=t,e},{})},e}(),m=n.createContext(null);m.displayName="StyleSheetContext";i.default.useInsertionEffect||i.default.useLayoutEffect;var _=void 0;function v(e){var t=_||n.useContext(m);return t&&t.add(e),null}v.dynamic=function(e){return e.map(function(e){return u(e[0],e[1])}).join(" ")},t.style=v},76180:(e,t,s)=>{"use strict";e.exports=s(75913).style},79551:e=>{"use strict";e.exports=require("url")},84283:(e,t,s)=>{Promise.resolve().then(s.t.bind(s,86346,23)),Promise.resolve().then(s.t.bind(s,27924,23)),Promise.resolve().then(s.t.bind(s,35656,23)),Promise.resolve().then(s.t.bind(s,40099,23)),Promise.resolve().then(s.t.bind(s,38243,23)),Promise.resolve().then(s.t.bind(s,28827,23)),Promise.resolve().then(s.t.bind(s,62763,23)),Promise.resolve().then(s.t.bind(s,97173,23))},91201:(e,t,s)=>{Promise.resolve().then(s.bind(s,60534))},94431:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>o,metadata:()=>r});var n=s(37413);s(61135);var i=s(60534);let r={title:"Loop",description:"모든 채팅을 한곳에."};function o({children:e}){return(0,n.jsx)("html",{lang:"ko",children:(0,n.jsx)("body",{children:(0,n.jsx)(i.default,{children:e})})})}},94588:e=>{e.exports={toast:"Toast_toast__n4V9V",fadeIn:"Toast_fadeIn__8co0A",fadeOut:"Toast_fadeOut__PBTbC",success:"Toast_success__n3sBF",error:"Toast_error__vTefu",info:"Toast_info__iczaj",warning:"Toast_warning__u1w7_",message:"Toast_message__Ivwz3"}}};var t=require("../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),n=t.X(0,[447,825,658],()=>s(9071));module.exports=n})();