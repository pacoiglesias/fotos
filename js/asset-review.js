/* One confirmation step for native camera, gallery, clipboard and received images. */
(function(root){
  'use strict';
  let pending=null;
  function cancel(){pending?.();}
  function open(options){
    cancel();
    return new Promise(resolve=>{
      let value=options.dataUrl,done=false;
      const dialog=document.createElement('dialog');dialog.className='asset-review';dialog.setAttribute('aria-label','Revisar archivo antes de usar');
      dialog.innerHTML='<div class="asset-review-head"><div><small>REVISAR ANTES DE CONTINUAR</small><h2></h2></div><button type="button" data-review="cancel" aria-label="Cancelar revisión">×</button></div><p class="asset-review-tip"></p><img alt="Vista completa del archivo seleccionado"><p class="asset-review-status" role="status"></p><div class="asset-review-actions"><button type="button" data-review="edit">Girar / ajustar</button><button type="button" data-review="restore">Restaurar archivo</button><button type="button" data-review="confirm">Confirmar archivo</button></div>';
      const find=a=>dialog.querySelector('[data-review="'+a+'"]'),image=dialog.querySelector('img');
      dialog.querySelector('h2').textContent=options.name || 'Imagen seleccionada';
      dialog.querySelector('.asset-review-tip').textContent=options.targetRatio?'Ajusta los cuatro bordes de la tarjeta. Si queda fondo alrededor, la identificación saldrá más pequeña. El destino es 85,60 × 53,98 mm, sin estirar.':options.photoMode?'Comprueba rostro, orientación y nitidez. La fotografía conserva sus proporciones.':'Comprueba orientación, bordes y legibilidad. Puedes ajustar las esquinas o conservar la imagen completa.';
      function finish(result){if(done)return;done=true;root.RealScanCapture?.close();dialog.close();dialog.remove();if(pending===dismiss)pending=null;resolve(result);}
      const dismiss=()=>finish(null);pending=dismiss;
      const paint=()=>{image.src=value;dialog.querySelector('.asset-review-status').textContent=value===options.dataUrl?'Archivo sin cambios. Confirmarlo no modifica sus bytes.':'Ajuste preparado. El archivo recibido se conserva por separado.';};
      find('cancel').onclick=dismiss;find('confirm').onclick=()=>finish(value);
      find('restore').onclick=()=>{value=options.dataUrl;paint();};
      find('edit').onclick=()=>root.RealScanCapture.open({sourceDataUrl:value,targetRatio:options.targetRatio,photoMode:!!options.photoMode,onAccept:data=>{if(!done){value=data;paint();}},onError:()=>{dialog.querySelector('.asset-review-status').textContent='No se pudo ajustar. Conserva el archivo o vuelve a intentarlo.';}});
      dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();});
      dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismiss();}});
      document.body.append(dialog);paint();dialog.showModal();
    });
  }
  root.RealScanReview={open,cancel};
  root.addEventListener('pagehide',cancel);
})(window);
