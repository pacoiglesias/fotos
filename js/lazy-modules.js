/* Carga perezosa de módulos pesados que no hacen falta al arrancar:
   la guía dúplex, la calibración y el enderezado solo se descargan cuando
   el operador los abre por primera vez. El build sigue copiando estos
   archivos y el service worker los precachea, así que también funcionan
   sin conexión una vez instalada la app; solo salen de la carga inicial.
   Para no romper a ningún llamador (botones, flujos y regresiones), este
   archivo deja primero un stub con la misma forma: open() carga el módulo
   real y lo abre; getGuide/renderGuide cargan en segundo plano. El módulo
   real, al cargarse, sustituye al stub; ensure() distingue ambos por la
   marca __lazyStub para no dar por cargado lo que solo es el stub. */
(function(root){
'use strict';
const pending={};
function isReal(name){const value=root[name];return !!value&&!value.__lazyStub;}
function ensure(src,globalName){
 if(isReal(globalName))return Promise.resolve(true);
 if(pending[src])return pending[src];
 pending[src]=new Promise(resolve=>{
  const script=document.createElement('script');
  script.src=src;script.async=true;
  script.onload=()=>resolve(isReal(globalName));
  script.onerror=()=>resolve(false);
  document.head.append(script);
 });
 return pending[src];
}
function stubOpen(src,name){return function(){return ensure(src,name).then(ok=>{if(ok)return root[name].open();if(typeof showToast==='function')showToast('No se pudo cargar esta herramienta. Reintenta.','warning');});};}
root.RealScanLazy={
 ensureDuplex:()=>ensure('js/duplex-assistant.js','RealScanDuplex'),
 ensureCalibration:()=>ensure('js/calibration-wizard.js','RealScanCalibrationWizard'),
 ensurePhotoFinish:()=>ensure('js/photo-finish.js','RealScanPhotoFinish')
};
if(!isReal('RealScanDuplex'))root.RealScanDuplex={__lazyStub:true,open:stubOpen('js/duplex-assistant.js','RealScanDuplex'),getGuide:function(){ensure('js/duplex-assistant.js','RealScanDuplex');return null;},renderGuide:function(container){ensure('js/duplex-assistant.js','RealScanDuplex').then(ok=>{if(ok)root.RealScanDuplex.renderGuide(container);});}};
if(!isReal('RealScanCalibrationWizard'))root.RealScanCalibrationWizard={__lazyStub:true,open:stubOpen('js/calibration-wizard.js','RealScanCalibrationWizard'),reference:function(){ensure('js/calibration-wizard.js','RealScanCalibrationWizard');return '';}};
if(!isReal('RealScanPhotoFinish'))root.RealScanPhotoFinish={__lazyStub:true,open:stubOpen('js/photo-finish.js','RealScanPhotoFinish')};
})(window);
