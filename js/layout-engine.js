/* ============================================================
   RealScan Pro — Layout Engine (Motor Unificado de Composición en mm)
   Desarrollado por Paco Iglesias • Escala 1:1 Físicamente Calibrada
   ============================================================ */

(function(window) {
  'use strict';

  /**
   * Calcula el plan de composición geométrico completo en milímetros.
   * Compartido idénticamente por:
   * 1. Vista previa interactiva en pantalla (.a4-sheet con paginación)
   * 2. Generador vectorial PDF (jsPDF)
   * 3. Exportador de imágenes a 300 DPI (Canvas / JPG / ZIP)
   * 4. Impresión nativa del navegador (@media print)
   *
   * @param {Object} state - Estado activo de la aplicación
   * @returns {Object} LayoutPlan con páginas, colocaciones en mm y validaciones
   */
  function computeDocumentLayout(state) {
    state = state || window.state || {};
    const paper = (typeof window.getActivePaperSpec === 'function') 
      ? window.getActivePaperSpec(state) 
      : (window.PAPER_SPECS && window.PAPER_SPECS[state.paperSize]) || { widthMm: 210, heightMm: 297, shortName: 'A4', name: 'A4' };

    let spec = null;
    if (typeof window.getActiveSpec === 'function') {
      spec = window.getActiveSpec(state);
    } else if (state.activeCategory === 'custom') {
      const u = state.customUnit || 'cm';
      const mul = (u === 'cm') ? 10 : ((u === 'in') ? 25.4 : 1);
      spec = {
        widthMm: Math.round((parseFloat(state.customWidth) || 8.5) * mul * 10) / 10,
        heightMm: Math.round((parseFloat(state.customHeight) || 5.5) * mul * 10) / 10,
        shortName: 'Medida Personalizada',
        isOval: false,
        category: 'custom'
      };
    } else if (window.FORMAT_SPECS && window.FORMAT_SPECS[state.format]) {
      spec = window.FORMAT_SPECS[state.format];
    } else {
      spec = { widthMm: 85.6, heightMm: 53.98, shortName: 'DNI / INE', isOval: false, category: 'docs' };
    }

    const outputScale = Math.max(25, Math.min(200, Number(state.outputScalePercent) || 100)) / 100;
    spec = Object.assign({}, spec, { widthMm: spec.widthMm * outputScale, heightMm: spec.heightMm * outputScale });
    const targetW = spec.widthMm;
    const targetH = spec.heightMm;
    const category = state.activeCategory || spec.category || 'docs';
    const isPhotos = (category === 'photos');

    // Opciones de acabado y anotaciones
    const includeRuler = (state.includeRulerFooter !== false);
    const includeLabels = (state.includeDocLabels !== false);
    const includeCutMarks = (state.includeCutMarks !== false);
    const customTitle = (state.documentCustomTitle || '').trim();
    const includeSheetTitle = !state.hideSheetTitle && (includeLabels || !!customTitle);
    const isCleanSheet = (!includeRuler && !includeLabels && !includeCutMarks && !customTitle);

    // Márgenes y límites físicos de seguridad
    const marginSide = 12; // 12 mm margen lateral mínimo
    const marginTop = (targetH > 100) ? 16 : 20; // 20 mm o 16 mm para documentos grandes
    const marginBottom = includeRuler ? 38 : 14; // Reserva para regla (38mm) o margen inferior (14mm)
    const availW = paper.widthMm - (marginSide * 2);
    const availH = paper.heightMm - marginTop - marginBottom;

    const plan = {
      paper: paper,
      spec: spec,
      category: category,
      totalPages: 1,
      pages: [],
      errors: [],
      warnings: [],
      isCleanSheet: isCleanSheet,
      cleanSheetMode: isCleanSheet,
      includeRulerFooter: includeRuler,
      includeDocLabels: includeLabels,
      includeCutMarks: includeCutMarks,
      isPhotoGrid: isPhotos,
      summary: ''
    };

    function finalizePlan(p) {
      function describeScale(text) {
        return outputScale === 1 ? text : text.replace(/escala 1:1(?: real)?/gi,'escala ' + Math.round(outputScale * 100) + ' %').replace(/a tama[ñÑ]o real 1:1/gi,'a escala ' + Math.round(outputScale * 100) + ' %');
      }
      p.summary = describeScale(p.summary);
      p.warnings = p.warnings.map(describeScale);
      p.pages.forEach(function(page) {
        if (!page.paper) page.paper = paper;
        if (!includeSheetTitle) page.sheetTitle = '';
        else if (!customTitle) page.sheetTitle = describeScale(page.sheetTitle || '');
      });
      if(['top','compact'].includes(state.sheetPosition))for(const page of p.pages){const items=page.placements;if(!items.length)continue;const dy=marginTop-Math.min(...items.map(i=>i.y)),dx=state.sheetPosition==='compact'?marginSide-Math.min(...items.map(i=>i.x)):0;for(const item of items){item.x+=dx;item.y+=dy;if(Number.isFinite(item.labelY))item.labelY+=dy;}}
const geom = validateDocumentGeometry(p, spec, paper);
      if (geom.errors && geom.errors.length > 0) {
        geom.errors.forEach(function(err) {
          if (!p.errors) p.errors = [];
          if (p.errors.indexOf(err) === -1) p.errors.push(err);
        });
      }
      if (geom.warnings && geom.warnings.length > 0) {
        geom.warnings.forEach(function(warn) {
          if (!p.warnings) p.warnings = [];
          if (p.warnings.indexOf(warn) === -1) p.warnings.push(warn);
        });
      }
      const sets=Math.max(1,Math.min(10,Math.round(Number(state.outputSets)||1)));
      p.basePages=p.pages.length;p.outputSets=sets;
      if(sets>1){const base=p.pages;p.pages=Array.from({length:sets},(_,set)=>base.map(page=>({...page,setNumber:set+1,placements:page.placements.map(item=>({...item}))}))).flat();p.pages.forEach((page,i)=>{page.pageIndex=i;page.pageNumber=i+1;});p.totalPages=p.pages.length;p.summary+=' · '+sets+' juegos · '+p.totalPages+' hojas totales';}
      return p;
    }

    // ============================================================
    // CASO A: FOTOGRAFÍAS OFICIALES (Retícula 1:1 con guías de corte)
    // ============================================================
    if (isPhotos) {
      const gap = targetW < 30 ? 3.5 : (targetW < 55 ? 4.5 : 6.0);
      const maxCols = Math.max(1, Math.floor((availW + gap) / (targetW + gap)));
      const maxRows = Math.max(1, Math.floor((availH + gap) / (targetH + gap)));
      const maxPerPage = Math.max(1, maxCols * maxRows);
      const requestedCopies = Math.max(1, parseInt(state.photoCopies, 10) || 1);

      // Limitar a máximo 2 páginas para no saturar memoria
      const maxSupportedPages = 2;
      const totalAllowed = maxPerPage * maxSupportedPages;
      const mixTwo = !!state.mixTwoPhotos;
      let copiesA = Math.ceil(requestedCopies / 2);
      let copiesB = Math.floor(requestedCopies / 2);
      if (mixTwo && typeof state.photoCopiesPersonA === 'number' && typeof state.photoCopiesPersonB === 'number') {
        copiesA = Math.max(0, parseInt(state.photoCopiesPersonA, 10) || 0);
        copiesB = Math.max(0, parseInt(state.photoCopiesPersonB, 10) || 0);
      }
      const effectiveRequested = mixTwo ? (copiesA + copiesB) : requestedCopies;
      const copies = Math.min(effectiveRequested, totalAllowed);

      if (effectiveRequested > totalAllowed) {
        plan.errors.push('La cantidad máxima soportada en ' + paper.shortName + ' es de ' + totalAllowed + ' fotos (' + maxSupportedPages + ' hojas). Reduce las copias antes de exportar.');
      }

      const totalPages = Math.max(1, Math.ceil(copies / maxPerPage));
      plan.totalPages = totalPages;

      let photoIndex = 0;
      for (let pIdx = 0; pIdx < totalPages; pIdx++) {
        const remaining = copies - photoIndex;
        const pageCopies = Math.min(remaining, maxPerPage);
        
        // Determinar columnas óptimas para las fotos de esta página
        let cols = maxCols;
        if (pageCopies === 1) cols = 1;
        else if (pageCopies === 2) cols = Math.min(2, maxCols);
        else if (pageCopies <= 4) cols = Math.min(2, maxCols);
        else if (pageCopies <= 6) cols = Math.min(3, maxCols);
        else if (pageCopies <= 8) cols = Math.min(4, maxCols);
        else cols = maxCols;

        cols = Math.max(cols, Math.ceil(pageCopies / maxRows));
        const rows = Math.ceil(pageCopies / cols);
        const gridW = cols * targetW + (cols - 1) * gap;
        const gridH = rows * targetH + (rows - 1) * gap;
        const startX = (paper.widthMm - gridW) / 2;
        const startY = marginTop + Math.max(0, (availH - gridH) / 2);

        const pageObj = {
          pageIndex: pIdx,
          pageNumber: pIdx + 1,
          sheetTitle: (customTitle || 'Planilla de Fotos Oficiales') + (totalPages > 1 ? ' • Hoja ' + (pIdx + 1) + ' de ' + totalPages : ''),
          hasRuler: includeRuler,
          rulerX: (paper.widthMm - 50) / 2,
          rulerY: paper.heightMm - 35,
          placements: []
        };

        for (let i = 0; i < pageCopies; i++) {
          const colIdx = i % cols;
          const rowIdx = Math.floor(i / cols);
          const xMm = startX + colIdx * (targetW + gap);
          const yMm = startY + rowIdx * (targetH + gap);

          const currentGlobalIdx = photoIndex;
          const useBack = (mixTwo && currentGlobalIdx >= copiesA);
          const personSlot = useBack ? 'back' : 'front';
          const personTag = mixTwo ? (useBack ? 'B' : 'A') : '';
          const photoNum = useBack ? (currentGlobalIdx - copiesA + 1) : (currentGlobalIdx + 1);

          pageObj.placements.push({
            slot: personSlot,
            globalIndex: currentGlobalIdx,
            slotNumber: photoNum,
            tag: personTag,
            xMm: Math.round(xMm * 10) / 10,
            yMm: Math.round(yMm * 10) / 10,
            widthMm: targetW,
            heightMm: targetH,
            isOval: !!spec.isOval,
            drawBorder: includeCutMarks && !spec.isOval,
            drawOvalGuide: includeCutMarks && !!spec.isOval,
            drawCutMarks: includeCutMarks,
            label: null
          });

          photoIndex++;
        }

        plan.pages.push(pageObj);
      }

      plan.summary = copies + ' fotos (' + spec.shortName + ') distribuidas en ' + totalPages + ' hoja(s) ' + paper.shortName;
      return finalizePlan(plan);
    }

    // ============================================================
    // CASO B: IDENTIFICACIONES Y DOCUMENTOS (1 a 4 Caras, Duplicados)
    // ============================================================
    const numPagesConfig = Math.min(4, Math.max(1, state.documentPageCount || 2));
    const isSingle = (state.printMode === 'single' || numPagesConfig === 1);
    const isBothSamePage = (state.printMode === 'both' && numPagesConfig === 2);
    const isBothSeparate = (state.printMode === 'both_separate');
    const isMultiPages = (numPagesConfig >= 3 || state.printMode === 'multi');
    const isDuplicate = !!state.duplicateCard;

    // Recopilar elementos activos según la cantidad de páginas configurada
    const allSlots = [
      { key: 'front', fallback: '1. Frente (Delantera con Foto)', shortLabel: 'Frente' },
      { key: 'back',  fallback: '2. Reverso (Atrás / Vuelta)',     shortLabel: 'Reverso' },
      { key: 'page3', fallback: '3. Página 3 (Adicional / Visa)',  shortLabel: 'Pág 3' },
      { key: 'page4', fallback: '4. Página 4 (Adicional / Visa)',  shortLabel: 'Pág 4' }
    ];

    const activeSlots = allSlots.slice(0, numPagesConfig);

    // ------------------------------------------------------------
    // SUB-CASO B1: MODO DUPLICADO (2 Juegos de Copias en 2 Columnas)
    // ------------------------------------------------------------
    if (isDuplicate) {
      const gapX = 14;
      const totalWidth2Col = targetW * 2 + gapX;

      if (totalWidth2Col > (paper.widthMm - 16)) {
        plan.warnings.push('El ancho de este formato (' + (targetW * 2) + ' mm) excede el ancho de la hoja ' + paper.shortName + ' en 2 columnas. Desactiva "2 Juegos" o selecciona una hoja más ancha.');
      }

      const startXCol1 = Math.max(marginSide, (paper.widthMm - totalWidth2Col) / 2);
      const startXCol2 = startXCol1 + targetW + gapX;
      const gapY = 12;

      // Calcular cuántos elementos caben por página verticalmente
      let currentY = marginTop;
      let currentPage = {
        pageIndex: 0,
        pageNumber: 1,
        sheetTitle: (state.documentCustomTitle || '').trim() || 'COPIA DOBLE OFICIAL (2 JUEGOS A TAMAÑO REAL 1:1)',
        hasRuler: includeRuler,
        rulerX: (paper.widthMm - 50) / 2,
        rulerY: paper.heightMm - 35,
        placements: []
      };
      plan.pages.push(currentPage);

      const columns = [
        { name: 'JUEGO 1', startX: startXCol1 },
        { name: 'JUEGO 2', startX: startXCol2 }
      ];

      activeSlots.forEach(function(slotObj, slotIdx) {
        // Verificar si este elemento cabe en la hoja actual
        if ((currentY + targetH) > (paper.heightMm - marginBottom)) {
          // PAGINACIÓN AUTOMÁTICA EN MODO DUPLICADO
          const nextIdx = plan.pages.length;
          currentPage = {
            pageIndex: nextIdx,
            pageNumber: nextIdx + 1,
            sheetTitle: ((state.documentCustomTitle || '').trim() || 'COPIA DOBLE OFICIAL') + ' • Hoja ' + (nextIdx + 1),
            hasRuler: includeRuler,
            rulerX: (paper.widthMm - 50) / 2,
            rulerY: paper.heightMm - 35,
            placements: []
          };
          plan.pages.push(currentPage);
          currentY = marginTop;
        }

        columns.forEach(function(col) {
          const customName = (state.documentCustomTitle || '').trim();
          const labelText = customName ? (customName + ' • ' + col.name + ': ' + slotObj.shortLabel) : (col.name + ' • ' + slotObj.fallback);

          currentPage.placements.push({
            slot: slotObj.key,
            globalIndex: slotIdx,
            slotNumber: slotIdx + 1,
            columnName: col.name,
            xMm: Math.round(col.startX * 10) / 10,
            yMm: Math.round(currentY * 10) / 10,
            widthMm: targetW,
            heightMm: targetH,
            isOval: !!spec.isOval,
            drawBorder: includeCutMarks && !spec.isOval,
            drawOvalGuide: includeCutMarks && !!spec.isOval,
            drawCutMarks: includeCutMarks,
            label: includeLabels ? (labelText + ' (' + targetW + ' × ' + targetH + ' mm)') : null,
            labelY: currentY - 2.5
          });
        });

        currentY += targetH + gapY;
      });

      plan.totalPages = plan.pages.length;
      plan.summary = '2 Juegos de ' + numPagesConfig + ' caras distribuidos a escala 1:1 en ' + plan.totalPages + ' hoja(s) ' + paper.shortName;
      return finalizePlan(plan);
    }

    // ------------------------------------------------------------
    // SUB-CASO B2: 2 CARAS SEPARADAS (1 Hoja para Frente y 1 Hoja para Reverso)
    // ------------------------------------------------------------
    if (isBothSeparate) {
      plan.totalPages = 2;
      const posX = (paper.widthMm - targetW) / 2;
      const posY = Math.max(marginTop, Math.round((availH - targetH) / 2) + marginTop);

      activeSlots.slice(0, 2).forEach(function(slotObj, idx) {
        const pageTitle = (state.documentCustomTitle || '').trim() 
          ? (state.documentCustomTitle + ' • ' + slotObj.shortLabel + ' (Hoja ' + (idx + 1) + ' de 2)')
          : (slotObj.fallback + ' • 1 Hoja Exclusiva (Hoja ' + (idx + 1) + ' de 2)');

        plan.pages.push({
          pageIndex: idx,
          pageNumber: idx + 1,
          sheetTitle: pageTitle,
          hasRuler: includeRuler,
          rulerX: (paper.widthMm - 50) / 2,
          rulerY: paper.heightMm - 35,
          placements: [{
            slot: slotObj.key,
            globalIndex: idx,
            slotNumber: idx + 1,
            xMm: Math.round(posX * 10) / 10,
            yMm: Math.round(posY * 10) / 10,
            widthMm: targetW,
            heightMm: targetH,
            isOval: !!spec.isOval,
            drawBorder: includeCutMarks && !spec.isOval,
            drawOvalGuide: includeCutMarks && !!spec.isOval,
            drawCutMarks: includeCutMarks,
            label: includeLabels ? (slotObj.fallback + ' (' + targetW + ' × ' + targetH + ' mm)') : null,
            labelY: posY - 2.5
          }]
        });
      });

      plan.summary = 'Anverso y Reverso en 2 hojas ' + paper.shortName + ' separadas (1 cara centrada por hoja a escala 1:1)';
      return finalizePlan(plan);
    }

    // ------------------------------------------------------------
    // SUB-CASO B3: 1 CARA SOLA (Centrada en Hoja)
    // ------------------------------------------------------------
    if (isSingle) {
      plan.totalPages = 1;
      const posX = (paper.widthMm - targetW) / 2;
      const posY = Math.max(marginTop, Math.round((availH - targetH) / 2) + marginTop);

      plan.pages.push({
        pageIndex: 0,
        pageNumber: 1,
        sheetTitle: (state.documentCustomTitle || '').trim() || (spec.shortName + ' — Escala 1:1 Real'),
        hasRuler: includeRuler,
        rulerX: (paper.widthMm - 50) / 2,
        rulerY: paper.heightMm - 35,
        placements: [{
          slot: 'front',
          globalIndex: 0,
          slotNumber: 1,
          xMm: Math.round(posX * 10) / 10,
          yMm: Math.round(posY * 10) / 10,
          widthMm: targetW,
          heightMm: targetH,
          isOval: !!spec.isOval,
          drawBorder: includeCutMarks && !spec.isOval,
          drawOvalGuide: includeCutMarks && !!spec.isOval,
          drawCutMarks: includeCutMarks,
          label: includeLabels ? (activeSlots[0].fallback + ' (' + targetW + ' × ' + targetH + ' mm)') : null,
          labelY: posY - 2.5
        }]
      });

      plan.summary = '1 Cara centrada en 1 hoja ' + paper.shortName + ' a escala 1:1 real';
      return finalizePlan(plan);
    }

    // ------------------------------------------------------------
    // SUB-CASO B4: 2 CARAS EN 1 HOJA O MULTIPÁGINA (3 a 4 Páginas)
    // ------------------------------------------------------------
    const gapY = 14;
    const fitsTwoPerSheet = ((marginTop + targetH * 2 + gapY) <= (paper.heightMm - marginBottom));
    const itemsPerSheet = fitsTwoPerSheet ? 2 : 1;

    if (!fitsTwoPerSheet && numPagesConfig >= 2) {
      plan.warnings.push('Las dimensiones del formato (' + targetH + ' mm de alto) no permiten alojar 2 caras juntas en 1 hoja ' + paper.shortName + '. Se paginan automáticamente en hojas independientes a escala 1:1.');
    }

    const totalSheets = Math.ceil(activeSlots.length / itemsPerSheet);
    plan.totalPages = totalSheets;

    const posX = (paper.widthMm - targetW) / 2;

    for (let sIdx = 0; sIdx < totalSheets; sIdx++) {
      const startSlotIdx = sIdx * itemsPerSheet;
      const currentSlots = activeSlots.slice(startSlotIdx, startSlotIdx + itemsPerSheet);

      const pageTitle = (totalSheets > 1) 
        ? ((state.documentCustomTitle || '').trim() || (spec.shortName + ' • Hoja ' + (sIdx + 1) + ' de ' + totalSheets))
        : ((state.documentCustomTitle || '').trim() || (spec.shortName + ' — Escala 1:1 Real'));

      const pageObj = {
        pageIndex: sIdx,
        pageNumber: sIdx + 1,
        sheetTitle: pageTitle,
        hasRuler: includeRuler,
        rulerX: (paper.widthMm - 50) / 2,
        rulerY: paper.heightMm - 35,
        placements: []
      };

      currentSlots.forEach(function(slotObj, localIdx) {
        let posY = marginTop;
        if (currentSlots.length === 2) {
          posY = (localIdx === 0) ? marginTop : (marginTop + targetH + gapY);
        } else {
          // Centrar verticalmente cuando solo va 1 elemento en la hoja
          posY = Math.max(marginTop, Math.round((availH - targetH) / 2) + marginTop);
        }

        pageObj.placements.push({
          slot: slotObj.key,
          globalIndex: startSlotIdx + localIdx,
          slotNumber: startSlotIdx + localIdx + 1,
          xMm: Math.round(posX * 10) / 10,
          yMm: Math.round(posY * 10) / 10,
          widthMm: targetW,
          heightMm: targetH,
          isOval: !!spec.isOval,
          drawBorder: includeCutMarks && !spec.isOval,
          drawOvalGuide: includeCutMarks && !!spec.isOval,
          drawCutMarks: includeCutMarks,
          label: includeLabels ? (slotObj.fallback + ' (' + targetW + ' × ' + targetH + ' mm)') : null,
          labelY: posY - 2.5
        });
      });

      plan.pages.push(pageObj);
    }

    if (numPagesConfig === 2 && fitsTwoPerSheet) {
      plan.summary = 'Anverso y Reverso alineados en 1 sola hoja ' + paper.shortName + ' a escala 1:1 real';
    } else {
      plan.summary = numPagesConfig + ' páginas distribuidas en ' + plan.totalPages + ' hoja(s) ' + paper.shortName + ' a escala 1:1 real';
    }

    return finalizePlan(plan);
  }

  /**
   * Validación geométrica común centralizada.
   * Comprueba dimensiones positivas/finitas, límites físicos del papel, márgenes y área útil.
   */
  function validateDocumentGeometry(plan, spec, paper) {
    const errors = [];
    const warnings = [];

    const effectiveSpec = spec || (plan && plan.spec);
    const effectivePaper = paper || (plan && plan.paper);

    if (!effectiveSpec || !effectivePaper) {
      errors.push('Especificación de documento o papel no definida.');
      return { valid: false, errors: errors, warnings: warnings };
    }

    const w = effectiveSpec.widthMm;
    const h = effectiveSpec.heightMm;
    const pw = effectivePaper.widthMm;
    const ph = effectivePaper.heightMm;

    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      errors.push('Las medidas del documento deben ser números positivos finitos (recibido: ' + w + ' × ' + h + ' mm).');
    } else {
      if (w > 1000 || h > 1000) {
        errors.push('Las dimensiones del documento exceden el límite máximo soportado de 1000 mm (' + w + ' × ' + h + ' mm).');
      }
      if (w > pw || h > ph) {
        errors.push('El documento (' + w + ' × ' + h + ' mm) supera el papel ' + (effectivePaper.shortName || 'seleccionado') + ' (' + pw + ' × ' + ph + ' mm).');
      }
    }

    if (plan && Array.isArray(plan.pages)) {
      plan.pages.forEach(function(page, pIdx) {
        const pageNum = page.pageNumber || (pIdx + 1);
        const pPaper = page.paper || effectivePaper;
        const pageW = pPaper.widthMm;
        const pageH = pPaper.heightMm;

        (page.placements || []).forEach(function(item) {
          const slotName = item.slot || 'elemento';
          if (!Number.isFinite(item.xMm) || !Number.isFinite(item.yMm) || !Number.isFinite(item.widthMm) || !Number.isFinite(item.heightMm)) {
            errors.push('Hoja ' + pageNum + ': Coordenadas o dimensiones no finitas en ' + slotName + '.');
            return;
          }

          if (item.widthMm <= 0 || item.heightMm <= 0) {
            errors.push('Hoja ' + pageNum + ': Dimensiones no positivas en ' + slotName + ' (' + item.widthMm + ' × ' + item.heightMm + ' mm).');
          }

          if (item.xMm < -0.1 || item.yMm < -0.1) {
            errors.push('Hoja ' + pageNum + ': Posición fuera de página en ' + slotName + ' (X: ' + item.xMm + ' mm, Y: ' + item.yMm + ' mm).');
          }

          if ((item.xMm + item.widthMm) > (pageW + 0.5) || (item.yMm + item.heightMm) > (pageH + 0.5)) {
            errors.push('Hoja ' + pageNum + ': ' + slotName + ' (' + item.widthMm + ' × ' + item.heightMm + ' mm en X:' + item.xMm + ', Y:' + item.yMm + ') desborda la hoja (' + pageW + ' × ' + pageH + ' mm).');
          }

          // Validación de colisión con regla de calibración si está activa
          if (page.hasRuler && Number.isFinite(page.rulerY)) {
            if ((item.yMm + item.heightMm) > (page.rulerY - 1)) {
              warnings.push('Hoja ' + pageNum + ': ' + slotName + ' invade el área de la regla de calibración al pie de página.');
            }
          }
        });
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  }

  // One physical geometry for preview, PDF and raster exports. Marks stay outside the photo.
  function cutGuideGeometry(item) {
    const x = item.xMm, y = item.yMm, w = item.widthMm, h = item.heightMm;
    const lines = [], gap = 0.4, tick = 1.2;
    if (item.drawCutMarks) {
      if (item.drawOvalGuide) {
        lines.push([x+w/2,y-gap-tick,x+w/2,y-gap], [x+w/2,y+h+gap,x+w/2,y+h+gap+tick],
          [x-gap-tick,y+h/2,x-gap,y+h/2], [x+w+gap,y+h/2,x+w+gap+tick,y+h/2]);
      } else {
        for (const cx of [x, x+w]) for (const cy of [y, y+h]) {
          const sx = cx === x ? -1 : 1, sy = cy === y ? -1 : 1;
          lines.push([cx+sx*gap,cy,cx+sx*(gap+tick),cy], [cx,cy+sy*gap,cx,cy+sy*(gap+tick)]);
        }
      }
    }
    return {x,y,w,h,oval:!!item.drawOvalGuide,border:!!item.drawBorder,lines};
  }

  // Processed images normally already match the frame. Imported/restored images may not.
  function imagePlacement(item, width, height) {
    if (!(width > 0 && height > 0)) return {x:item.xMm,y:item.yMm,w:item.widthMm,h:item.heightMm};
    const scale = Math.min(item.widthMm/width, item.heightMm/height), w = width*scale, h = height*scale;
    return {x:item.xMm+(item.widthMm-w)/2,y:item.yMm+(item.heightMm-h)/2,w,h};
  }

  // Exportar al objeto global
  const layoutExports = {
    computeDocumentLayout: computeDocumentLayout,
    validateDocumentGeometry: validateDocumentGeometry,
    cutGuideGeometry: cutGuideGeometry,
    imagePlacement: imagePlacement
  };

  if (typeof window !== 'undefined') {
    window.RealScanLayout = layoutExports;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = layoutExports;
  }

})(typeof window !== 'undefined' ? window : this);
