(async function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    queue = [];
  let sending = false, sessionReady = false, preparing = false;
  let captureMode = new URLSearchParams(location.hash.slice(1)).get('mode')==='photo'?'photo':'document';
  const status = document.createElement("p");
  status.id = "transferStatus";
  status.setAttribute("role", "status");
  status.className = "text-xs text-center text-slate-600";
  $("btnSendFiles").after(status);
  function report(message, error = false) {
    status.textContent = message;
    status.classList.toggle("text-red-600", error);
  }
  function render() {
    $("selectedFilesContainer").classList.toggle("hidden", !queue.length);
    $("filesCount").textContent = queue.length;
    $("btnSendFiles").disabled = !sessionReady || sending || preparing || !queue.length;
    $("btnSmartScan").disabled = !sessionReady || sending || preparing || queue.length>=8;
    $("btnSmartScan").textContent=captureMode==='photo'?'Tomar fotografía'+(queue.length?' ('+queue.length+'/8)':''):queue.length?"Escanear otra página ("+queue.length+"/8)":"Encuadrar y escanear documento";
    for(const [id,mode]of [['btnModeDocument','document'],['btnModePhoto','photo']]){$(id).setAttribute('aria-pressed',String(mode===captureMode));$(id).disabled=sending||preparing;}
    $('captureModeHelp').textContent=captureMode==='photo'?'Fotografía: conserva su orientación y proporciones. El tamaño de impresión se elige en el mostrador.':'Documento: busca sus cuatro bordes, revisa el recorte y confirma antes de enviar.';
    $("fileInput").disabled = $("cameraInput").disabled = !sessionReady || sending || preparing;
    $('selectTransferPolicy').disabled = sending || preparing;
    $('transferPolicyHelp').textContent = $('selectTransferPolicy').value==='preserve' ? 'Archivo sin modificar, hasta 6 MB. Puede conservar ubicación y otros metadatos. Un ajuste manual crea una imagen nueva; podrás restaurar el archivo recibido.' : 'Imágenes JPG hasta 3000 px, proporciones conservadas y metadatos eliminados. PDF sin cambios. Máximo 6 MB por archivo y 8 archivos.';
    $("thumbnailsList").replaceChildren();
    queue.forEach((f, index) => {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between gap-2 p-2 text-xs";
      const name = document.createElement("span");
      name.textContent = f.name + " · " + Math.round(f.size / 1024) + " KB · " + (f.captureEdited?'Captura revisada · ':'') + (f.transferPolicy==='preserve'?'Archivo sin modificar':'Imagen optimizada') + (f.width?' · '+f.width+' × '+f.height+' px':'');
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "Quitar";
      b.disabled = sending || preparing;
      b.onclick = () => {
        queue.splice(index, 1);
        render();
      };
      if (f.type.startsWith('image/')) {
        const thumb = document.createElement('img');
        thumb.src = f.dataUrl; thumb.alt = 'Vista previa del archivo '+(index+1);
        thumb.width = 56; thumb.height = 52;
        thumb.style.cssText = 'width:56px;height:52px;object-fit:contain;border-radius:8px;background:#e2e8f0;flex-shrink:0';
        row.append(thumb);
      }
      name.style.cssText='min-width:0;overflow-wrap:anywhere';row.style.flexWrap='wrap';
      if(f.type.startsWith('image/')){
        const edit=document.createElement('button');edit.type='button';edit.textContent='Revisar / girar';edit.disabled=sending||preparing;
        edit.onclick=()=>RealScanCapture.open({sourceDataUrl:f.originalDataUrl||f.dataUrl,photoMode:(f.captureMode||captureMode)==='photo',onAccept:async result=>{if(sending||preparing||!queue.includes(f))return;preparing=true;render();try{const blob=await(await fetch(result)).blob();const replacement=await prepare(new File([blob],f.name,{type:blob.type}),'optimize');replacement.captureMode=f.captureMode;replacement.originalDataUrl=f.originalDataUrl||f.dataUrl;replacement.originalName=f.originalName||f.name;replacement.originalPolicy=f.originalPolicy||f.transferPolicy;queue[queue.indexOf(f)]=replacement;render();}catch(e){report(e.message,true);}finally{preparing=false;render();}}});row.append(edit);
        if(f.originalDataUrl){const restore=document.createElement('button');restore.type='button';restore.textContent='Original';restore.disabled=sending||preparing;restore.onclick=async()=>{if(sending||preparing)return;preparing=true;render();try{const blob=await(await fetch(f.originalDataUrl)).blob();const restored=await prepare(new File([blob],f.originalName||f.name,{type:blob.type}),'preserve');restored.transferPolicy=f.originalPolicy||f.transferPolicy;restored.captureMode=f.captureMode;queue[queue.indexOf(f)]=restored;}catch(e){report(e.message,true);}finally{preparing=false;render();}};row.append(restore);}
      }
      for(const [label,step] of [['↑',-1],['↓',1]]){const move=document.createElement('button');move.type='button';move.textContent=label;move.setAttribute('aria-label',step<0?'Mover antes':'Mover después');move.disabled=sending||preparing||index+step<0||index+step>=queue.length;move.onclick=()=>{[queue[index],queue[index+step]]=[queue[index+step],queue[index]];render();};row.append(move);}
      row.append(name,b);
      $("thumbnailsList").append(row);
    });
  }
  async function prepare(file, policy = $('selectTransferPolicy').value) {
    if (file.size <= 0 || file.size > 30 * 1024 * 1024)
      throw Error("Elige un archivo de hasta 30 MB.");
    let type = file.type,
      dataUrl,
      name = file.name, width = null, height = null;
    if (type === "application/pdf" || /\.pdf$/i.test(name)) {
      type = "application/pdf";
      policy = 'preserve';
      dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(Error("No se pudo leer el PDF."));
        r.readAsDataURL(new Blob([file], { type }));
      });
    } else {
      const image = await createImageBitmap(file).catch(() => {
        throw Error(
          "No se pudo abrir la imagen. Si es HEIC, expórtala como JPG.",
        );
      });
      if (image.width * image.height > 60000000) {
        image.close();
        throw Error("La imagen supera 60 megapíxeles. Reduce su resolución.");
      }
      width=image.width;height=image.height;
      if(policy==='preserve') {
        image.close();
        if(!['image/jpeg','image/png','image/webp'].includes(type))throw Error('Conservar archivo admite JPG, PNG o WebP. Elige optimizar para convertir esta imagen.');
        if(file.size>6*1024*1024)throw Error('El archivo supera 6 MB. No se modificó: elige Optimizar y selecciónalo otra vez, o entrégalo por USB.');
        dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('No se pudo leer la imagen.'));reader.readAsDataURL(file);});
      } else {
      const scale = Math.min(1, 3000 / Math.max(image.width, image.height)),
        c = document.createElement("canvas");
      c.width = Math.round(image.width * scale);
      c.height = Math.round(image.height * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(image, 0, 0, c.width, c.height);
      image.close();
      type = "image/jpeg";
      name = name.replace(/\.[^.]*$/, "") + ".jpg";
      dataUrl = c.toDataURL(type, 0.94);
      width=c.width;height=c.height;
      }
    }
    const f = {
      name: name.slice(0, 180),
      captureMode,
      transferPolicy:policy,width,height,
      type,
      dataUrl,
      size: atob(dataUrl.split(',')[1]).length,
    };
    RealScanRelay.validate(f);
    return f;
  }
  async function choose(files, captured = false) {
    if (sending || preparing || !sessionReady) return;
    preparing = true; render();
    try {
      for (const f of files) {
        if (queue.length >= 8)
          throw Error("Puedes enviar hasta 8 archivos por sesión.");
        const prepared=await prepare(f);prepared.captureEdited=captured;queue.push(prepared);
      }
      report('Listo para enviar. Revisa las miniaturas, su orientación y la preparación indicada en cada archivo.');
    } catch (e) {
      report(e.message, true);
    }
    preparing = false; render();
  }
  $("btnSmartScan").onclick = () => {
    if (!sessionReady || sending || preparing) return;
    RealScanCapture.open({photoMode:captureMode==='photo',onNative: () => $("cameraInput").click(), onAccept: async dataUrl => {
      const blob = await (await fetch(dataUrl)).blob();
      await choose([new File([blob], captureMode==='photo'?"Foto.jpg":"Escaneo.jpg", {type: "image/jpeg"})],true);
    }});
  };
  for(const [id,mode]of [['btnModeDocument','document'],['btnModePhoto','photo']])$(id).onclick=()=>{if(sending||preparing)return;captureMode=mode;render();};
  $('selectTransferPolicy').onchange=render;
  for (const id of ["fileInput", "cameraInput"])
    $(id).addEventListener("change", function () {
      choose(Array.from(this.files));
      this.value = "";
    });
  $("btnClearFiles").onclick = () => {
    if (!sending && !preparing) {
      queue.length = 0;
      render();
    }
  };
  $("btnSendMore").onclick = () => {
    $("successBox").classList.add("hidden");
    render();
  };
  $("btnSendFiles").onclick = async () => {
    if (!sessionReady || sending || preparing || !queue.length) return;
    sending = true;
    render();
    $("successBox").classList.add("hidden");
    $("progressContainer").classList.remove("hidden");
    const total = queue.length;
    let sent = 0;
    try {
      while (queue.length) {
        report("Esperando confirmación del mostrador…");
        await RealScanRelay.send(queue[0]);
        queue.shift();
        sent++;
        const pct = Math.round((sent / total) * 100);
        $("progressBar").style.width = pct + "%";
        $("progressPercent").textContent = pct + "%";
      }
      report("Recepción confirmada por el mostrador.");
      $("successBox").classList.remove("hidden");
    } catch (e) {
      report(
        e.message ||
          "No se confirmó el envío. Reintenta con el mostrador abierto.",
        true,
      );
    } finally {
      sending = false;
      $("progressContainer").classList.add("hidden");
      render();
    }
  };
  render();
  try {
    const s = await RealScanRelay.readSession("receive");
    sessionReady = true; render();
    $("labelSessionId").textContent = "RS-" + s.token.slice(0, 8).toUpperCase();
    report("Sesión activa durante 15 minutos. Mantén abierto el mostrador.");
  } catch (e) {
    report(
      "No se pudo abrir esta sesión. Solicita un QR nuevo al operador.",
      true,
    );
    $("btnSendFiles").disabled = true;
    $("fileInput").disabled = true;
    $("cameraInput").disabled = true;
  }
})();
