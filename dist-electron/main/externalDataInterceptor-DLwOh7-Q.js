"use strict";const r=require("./getSSOTokenFromFile-c3UheaqJ.js"),n=require("./index-B-kSrMS1.js"),o={getFileRecord(){return n.fileIntercept},interceptFile(e,t){n.fileIntercept[e]=Promise.resolve(t)},getTokenRecord(){return r.tokenIntercept},interceptToken(e,t){r.tokenIntercept[e]=t}};exports.externalDataInterceptor=o;
//# sourceMappingURL=externalDataInterceptor-DLwOh7-Q.js.map
