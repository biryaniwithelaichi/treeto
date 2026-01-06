"use strict";const r=require("./index-B-kSrMS1.js"),t=(...s)=>{const e={};for(const o of s)for(const[n,i]of Object.entries(o))e[n]!==void 0?Object.assign(e[n],i):e[n]=i;return e},c=async s=>{const e=await r.loadSharedConfigFiles(s);return t(e.configFile,e.credentialsFile)};exports.parseKnownFiles=c;
//# sourceMappingURL=parseKnownFiles--W3Yg_Lv.js.map
