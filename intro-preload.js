'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('tjIntro',Object.freeze({finish:()=>ipcRenderer.send('tj:intro:finish')}));
