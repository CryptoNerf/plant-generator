import React, { useState, useRef, useEffect, useCallback } from 'react';

const PlantGenerator = () => {
  const canvasRef = useRef();
  const [plantType, setPlantType] = useState('tree');
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [params, setParams] = useState({
    branches: 6,
    length: 80,
    angle: 25,
    thickness: 8,
    levels: 4,
    leafSize: 12,
    leafDensity: 0.7,
    color: '#8B4513',
    leafColor: '#228B22',
    centerColor: '#FFD700',
    centerSize: 10, // Добавлено для исправления слайдера в цветке

    // Новые параметры для градиента и обводки (исправлена согласованность имён)
    UseGradient: false,
    GradientStartColor: '#8B4513',
    GradientEndColor: '#A0522D',
    UseStroke: false,
    StrokeColor: '#000000',
    StrokeWidth: 1,

    // Отдельные настройки для листьев/лепестков
    leafUseGradient: false,
    leafGradientStartColor: '#228B22',
    leafGradientEndColor: '#32CD32',
    leafUseStroke: false,
    leafStrokeColor: '#006400',
    leafStrokeWidth: 1,

    // Для центра цветка
    centerUseGradient: false,
    centerGradientStartColor: '#FFD700',
    centerGradientEndColor: '#FFA500',
    centerUseStroke: false,
    centerStrokeColor: '#8B4513',
    centerStrokeWidth: 1,
  });
  
  const [svgElements, setSvgElements] = useState([]);
  const [svgDefs, setSvgDefs] = useState([]);

  // Обработка изменения размера экрана
  const updateScreenSize = useCallback(() => {
    if (typeof window !== 'undefined') {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
  }, []);

  useEffect(() => {
    updateScreenSize();
    const handleResize = () => {
      updateScreenSize();
      setTimeout(generatePlant, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateScreenSize]);

  useEffect(() => {
    generatePlant();
  }, [plantType, params, screenSize]);

  const getCanvasSize = useCallback(() => {
    const width = screenSize.width || (typeof window !== 'undefined' ? window.innerWidth : 600);
    const height = screenSize.height || (typeof window !== 'undefined' ? window.innerHeight : 450);
    
    if (width < 320) return { width: 280, height: 210 };
    else if (width < 480) return { width: Math.min(width - 40, 320), height: 240 };
    else if (width < 640) return { width: Math.min(width - 60, 400), height: 300 };
    else if (width < 768) return { width: Math.min(width - 80, 500), height: 375 };
    else if (width < 1024) return { width: Math.min((width - 150) * 0.6, 450), height: 340 };
    else if (width < 1200) return { width: Math.min((width - 200) * 0.65, 500), height: 375 };
    else return { width: Math.min((width - 250) * 0.7, 600), height: 450 };
  }, [screenSize]);

  const generatePlant = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width: canvasWidth, height: canvasHeight } = getCanvasSize();
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    const centerX = canvasWidth / 2;
    let centerY;

    switch (plantType) {
      case 'tree':
      case 'flower':
        centerY = canvasHeight - Math.min(30, canvasHeight * 0.1);
        break;
      case 'bush':
        centerY = canvasHeight / 2;
        break;
      default:
        centerY = canvasHeight - Math.min(30, canvasHeight * 0.1);
    }
    
    const tempSvgElements = [];
    const tempSvgDefs = [];
    
    try {
      if (plantType === 'tree') {
        drawTree(ctx, centerX, centerY, params.length, -Math.PI/2, params.thickness, params.levels, tempSvgElements, tempSvgDefs);
      } else if (plantType === 'flower') {
        drawFlower(ctx, centerX, centerY, tempSvgElements, tempSvgDefs);
      } else if (plantType === 'bush') {
        drawBush(ctx, centerX, centerY, tempSvgElements, tempSvgDefs);
      }
    } catch (e) {
      console.error('Error generating plant:', e);
    }
    
    setSvgElements(tempSvgElements);
    setSvgDefs(tempSvgDefs);
  }, [plantType, params, getCanvasSize]);

  const createGradient = (ctx, x1, y1, x2, y2, startColor, endColor, id, svgDefs) => {
    svgDefs.push(
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
        <stop offset="0%" stop-color="${startColor}" />
        <stop offset="100%" stop-color="${endColor}" />
      </linearGradient>`
    );
    const svgStyle = `url(#${id})`;

    if (ctx) {
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, startColor);
      gradient.addColorStop(1, endColor);
      return { canvasStyle: gradient, svgStyle };
    } else {
      return { canvasStyle: null, svgStyle };
    }
  };

  const drawTree = (ctx, x, y, length, angle, thickness, level, svgElements, svgDefs) => {
    if (level <= 0 || length < 3 || thickness < 0.5 || level > 8) return;
    
    const scale = Math.min(screenSize.width || 600, 600) / 600;
    length = Math.max(3, Math.min(length * scale, 200));
    thickness = Math.max(0.5, Math.min(thickness * scale, 30));
    
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    
    if (!isFinite(endX) || !isFinite(endY) || !isFinite(x) || !isFinite(y)) return;

    let strokeStyle = params.color; // <-- по умолчанию цвет
    let svgStroke = params.color;
    let strokeOutlineColor = params.StrokeColor;
    let useStrokeOutline = params.UseStroke;
    let strokeOutlineWidth = params.StrokeWidth;

    // Градиент для ствола
    if (params.UseGradient) {
      const gradientId = `grad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const grad = createGradient(ctx, x, y, endX, endY, params.GradientStartColor, params.GradientEndColor, gradientId, svgDefs);
      strokeStyle = grad.canvasStyle;
      svgStroke = grad.svgStyle;
    }

    if (ctx) {
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      if (useStrokeOutline) {
        // Сначала обводка (толще)
        ctx.strokeStyle = strokeOutlineColor;
        ctx.lineWidth = thickness + 2 * strokeOutlineWidth;
        ctx.stroke();

        // Затем основной ствол поверх
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = thickness;
        ctx.stroke();
      } else {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = thickness;
        ctx.stroke();
      }
    }
    
    // SVG элемент
    const svgLine = {
      type: 'line',
      x1: x, y1: y, x2: endX, y2: endY,
      stroke: svgStroke,
      strokeWidth: thickness,
      strokeLinecap: 'round'
    };

    if (useStrokeOutline) {
      svgLine.strokeOutline = {
        color: strokeOutlineColor,
        width: strokeOutlineWidth
      };
    }

    svgElements.push(svgLine);
    
    if (level <= 2 && Math.random() < params.leafDensity) {
      drawLeaf(ctx, endX, endY, svgElements, svgDefs, scale);
    }
    
    const newLength = length * 0.75;
    const newThickness = Math.max(0.5, thickness * 0.7);
    const angleStep = params.angle * Math.PI / 180;
    const maxBranches = Math.min(params.branches, 6);
    
    for (let i = 0; i < maxBranches; i++) {
      const branchAngle = angle + (angleStep * (i - maxBranches/2 + 0.5)) + (Math.random() - 0.5) * 0.2;
      drawTree(ctx, endX, endY, newLength, branchAngle, newThickness, level - 1, svgElements, svgDefs);
    }
  };

  const drawLeaf = (ctx, x, y, svgElements, svgDefs, scale = 1) => {
    if (!isFinite(x) || !isFinite(y)) return;
    
    const rotation = Math.random() * Math.PI * 2;
    const rx = Math.max(2, (params.leafSize / 2) * scale);
    const ry = Math.max(3, params.leafSize * scale);
    
    let fillStyle = params.leafColor;
    let strokeStyle = params.leafStrokeColor;
    let useStroke = params.leafUseStroke;
    let strokeWidth = params.leafStrokeWidth;

    const rotationDeg = (rotation * 180) / Math.PI;

    if (ctx) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);

      if (params.leafUseGradient) {
        const gradient = ctx.createLinearGradient(-rx, 0, rx, 0);
        gradient.addColorStop(0, params.leafGradientStartColor);
        gradient.addColorStop(1, params.leafGradientEndColor);
        fillStyle = gradient;
      }

      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      if (useStroke) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Для SVG
    let svgFill = params.leafColor;
    if (params.leafUseGradient) {
      const gradientId = `leafGrad_${Math.random().toString(36).substr(2, 9)}`;
      svgDefs.push(
        `<linearGradient id="${gradientId}" gradientUnits="objectBoundingBox" x1="0" y1="0.5" x2="1" y2="0.5" gradientTransform="rotate(${rotationDeg} 0.5 0.5)">
          <stop offset="0%" stop-color="${params.leafGradientStartColor}" />
          <stop offset="100%" stop-color="${params.leafGradientEndColor}" />
        </linearGradient>`
      );
      svgFill = `url(#${gradientId})`;
    }

    const svgLeaf = {
      type: 'ellipse',
      cx: x, cy: y,
      rx, ry,
      fill: svgFill,
      rotation: rotation
    };

    if (useStroke) {
      svgLeaf.stroke = strokeStyle;
      svgLeaf.strokeWidth = strokeWidth;
    }

    svgElements.push(svgLeaf);
  };

  const drawFlower = (ctx, centerX, centerY, svgElements, svgDefs) => {
    if (!isFinite(centerX) || !isFinite(centerY)) return;
    
    const scale = Math.min(screenSize.width || 600, 600) / 600;
    const stemLength = Math.max(30, Math.min(params.length * scale, 250));
    const stemEndY = centerY - stemLength;
    const stemThickness = Math.max(2, Math.min(params.thickness * scale, 15));
    
    let stemFillStyle = params.color;
    let svgStemStroke = params.color;
    let stemStrokeStyle = params.StrokeColor;
    let stemUseStroke = params.UseStroke;
    let stemStrokeWidth = params.StrokeWidth;

    if (params.UseGradient) {
      const gradientId = `stemGrad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const grad = createGradient(ctx, centerX, centerY, centerX, stemEndY, params.GradientStartColor, params.GradientEndColor, gradientId, svgDefs);
      stemFillStyle = grad.canvasStyle;
      svgStemStroke = grad.svgStyle;
    }

    if (ctx) {
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX, stemEndY);
      if (stemUseStroke) {
        // Сначала обводка
        ctx.strokeStyle = stemStrokeStyle;
        ctx.lineWidth = stemThickness + 2 * stemStrokeWidth;
        ctx.stroke();

        // Затем основной
        ctx.strokeStyle = stemFillStyle;
        ctx.lineWidth = stemThickness;
        ctx.stroke();
      } else {
        ctx.strokeStyle = stemFillStyle;
        ctx.lineWidth = stemThickness;
        ctx.stroke();
      }
    }
    
    const svgStem = {
      type: 'line',
      x1: centerX, y1: centerY, x2: centerX, y2: stemEndY,
      stroke: svgStemStroke,
      strokeWidth: stemThickness,
      strokeLinecap: 'round'
    };

    if (stemUseStroke) {
      svgStem.strokeOutline = {
        color: stemStrokeStyle,
        width: stemStrokeWidth
      };
    }

    svgElements.push(svgStem);
    
    const petals = Math.max(3, Math.min(params.branches, 15));
    const petalLength = Math.max(10, Math.min((params.leafSize * 2) * scale, 50));
    
    for (let i = 0; i < petals; i++) {
      const angle = (i * Math.PI * 2) / petals;
      const petalX = centerX + Math.cos(angle) * petalLength;
      const petalY = stemEndY + Math.sin(angle) * petalLength;
      
      const rx = Math.max(3, (petalLength / 3) * scale);
      const ry = Math.max(2, (petalLength / 6) * scale);
      
      let petalFillStyle = params.leafColor;
      let petalStrokeStyle = params.leafStrokeColor;
      let petalUseStroke = params.leafUseStroke;
      let petalStrokeWidth = params.leafStrokeWidth;

      const rotationDeg = (angle * 180) / Math.PI;

      if (ctx) {
        ctx.save();
        ctx.translate(petalX, petalY);
        ctx.rotate(angle);

        if (params.leafUseGradient) {
          const gradient = ctx.createLinearGradient(-rx, 0, rx, 0);
          gradient.addColorStop(0, params.leafGradientStartColor);
          gradient.addColorStop(1, params.leafGradientEndColor);
          petalFillStyle = gradient;
        }

        ctx.fillStyle = petalFillStyle;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        if (petalUseStroke) {
          ctx.strokeStyle = petalStrokeStyle;
          ctx.lineWidth = petalStrokeWidth;
          ctx.stroke();
        }
        ctx.restore();
      }
      
      // Для SVG лепестков
      let svgPetalFill = params.leafColor;
      if (params.leafUseGradient) {
        const gradientId = `petalGrad_${Math.random().toString(36).substr(2, 9)}`;
        svgDefs.push(
          `<linearGradient id="${gradientId}" gradientUnits="objectBoundingBox" x1="0" y1="0.5" x2="1" y2="0.5" gradientTransform="rotate(${rotationDeg} 0.5 0.5)">
            <stop offset="0%" stop-color="${params.leafGradientStartColor}" />
            <stop offset="100%" stop-color="${params.leafGradientEndColor}" />
          </linearGradient>`
        );
        svgPetalFill = `url(#${gradientId})`;
      }

      const svgPetal = {
        type: 'ellipse',
        cx: petalX, cy: petalY,
        rx, ry,
        fill: svgPetalFill,
        rotation: angle
      };

      if (petalUseStroke) {
        svgPetal.stroke = petalStrokeStyle;
        svgPetal.strokeWidth = petalStrokeWidth;
      }

      svgElements.push(svgPetal);
    }
    
    const centerRadius = Math.max(3, Math.min(params.centerSize * scale, 25));
    let centerFillStyle = params.centerColor;
    let svgCenterFill = params.centerColor;
    let centerStrokeStyle = params.centerStrokeColor;
    let centerUseStroke = params.centerUseStroke;
    let centerStrokeWidth = params.centerStrokeWidth;

    if (params.centerUseGradient) {
      const gradientId = `centerGrad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const grad = createGradient(ctx, centerX - centerRadius, stemEndY, centerX + centerRadius, stemEndY, params.centerGradientStartColor, params.centerGradientEndColor, gradientId, svgDefs);
      centerFillStyle = grad.canvasStyle;
      svgCenterFill = grad.svgStyle;
    }

    if (ctx) {
      ctx.fillStyle = centerFillStyle;
      ctx.beginPath();
      ctx.arc(centerX, stemEndY, centerRadius, 0, Math.PI * 2);
      ctx.fill();

      if (centerUseStroke) {
        ctx.strokeStyle = centerStrokeStyle;
        ctx.lineWidth = centerStrokeWidth;
        ctx.stroke();
      }
    }
    
    const svgCenter = {
      type: 'circle',
      cx: centerX, cy: stemEndY, r: centerRadius,
      fill: svgCenterFill
    };

    if (centerUseStroke) {
      svgCenter.stroke = centerStrokeStyle;
      svgCenter.strokeWidth = centerStrokeWidth;
    }

    svgElements.push(svgCenter);
  };

  const drawBush = (ctx, centerX, centerY, svgElements, svgDefs) => {
    if (!isFinite(centerX) || !isFinite(centerY)) return;
    
    const branches = Math.max(4, Math.min(params.branches * 2, 16));
    const scale = Math.min(screenSize.width || 600, 600) / 600;
    
    for (let i = 0; i < branches; i++) {
      const angle = Math.random() * Math.PI * 2;
      const length = Math.max(25, params.length * (0.5 + Math.random() * 0.4) * scale);
      const thickness = Math.max(1, params.thickness * 0.6 * scale);
      
      drawTree(ctx, centerX, centerY, length, angle - Math.PI/2, thickness, 
        Math.max(1, Math.min(params.levels, 4)), svgElements, svgDefs);
    }
  };

  const handleParamChange = (param, value) => {
    setParams(prev => ({ ...prev, [param]: value }));
  };

  const downloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `растение-${plantType}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadSVG = () => {
    const svgContent = generateSVG();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `растение-${plantType}-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateSVG = () => {
    const { width: svgWidth, height: svgHeight } = getCanvasSize();
    
    const defsStr = svgDefs.join('\n    '); // <-- ВАЖНО: это строки, а не JSX!
    
    const svgElements_str = svgElements.map(element => {
      switch (element.type) {
        case 'line':
          let lineStr = '';
          if (element.strokeOutline) {
            const outlineWidth = element.strokeWidth + 2 * element.strokeOutline.width;
            lineStr += `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${element.strokeOutline.color}" stroke-width="${outlineWidth}" stroke-linecap="${element.strokeLinecap || 'round'}" />\n    `;
            lineStr += `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${element.stroke}" stroke-width="${element.strokeWidth}" stroke-linecap="${element.strokeLinecap || 'round'}" />`;
          } else {
            lineStr = `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${element.stroke}" stroke-width="${element.strokeWidth}" stroke-linecap="${element.strokeLinecap || 'round'}" />`;
          }
          return lineStr;
        case 'ellipse':
          let strokeAttrs = '';
          if (element.stroke) {
            strokeAttrs = `stroke="${element.stroke}" stroke-width="${element.strokeWidth}"`;
          }
          const transform = element.rotation ? `transform="rotate(${element.rotation * 180 / Math.PI} ${element.cx} ${element.cy})"` : '';
          return `<ellipse cx="${element.cx}" cy="${element.cy}" rx="${element.rx}" ry="${element.ry}" fill="${element.fill}" ${transform} ${strokeAttrs}/>`;
        case 'circle':
          let circleStrokeAttrs = '';
          if (element.stroke) {
            circleStrokeAttrs = `stroke="${element.stroke}" stroke-width="${element.strokeWidth}"`;
          }
          return `<circle cx="${element.cx}" cy="${element.cy}" r="${element.r}" fill="${element.fill}" ${circleStrokeAttrs}/>`;
        default:
          return '';
      }
    }).join('\n    ');

    return `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      ${defsStr}
    </defs>
      ${svgElements_str}
  </svg>`;
  };

  const renderGradientControls = (prefix, label, color1, color2, useGradient, strokeColor, strokeWidth, useStroke) => (
    <>
      <div className="checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={useGradient}
            onChange={(e) => handleParamChange(`${prefix}UseGradient`, e.target.checked)}
            className="checkbox-input"
          />
          {label} градиент
        </label>
      </div>
      {useGradient && (
        <div className="color-controls">
          <div className="color-input-group">
            <label className="color-label">Начало</label>
            <input
              type="color"
              value={color1}
              onChange={(e) => handleParamChange(`${prefix}GradientStartColor`, e.target.value)}
              className="color-input"
            />
          </div>
          <div className="color-input-group">
            <label className="color-label">Конец</label>
            <input
              type="color"
              value={color2}
              onChange={(e) => handleParamChange(`${prefix}GradientEndColor`, e.target.value)}
              className="color-input"
            />
          </div>
        </div>
      )}
      <div className="checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={useStroke}
            onChange={(e) => handleParamChange(`${prefix}UseStroke`, e.target.checked)}
            className="checkbox-input"
          />
          {label} обводка
        </label>
      </div>
      {useStroke && (
        <>
          <div className="color-input-group">
            <label className="color-label">Цвет обводки</label>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => handleParamChange(`${prefix}StrokeColor`, e.target.value)}
              className="color-input"
            />
          </div>
          <div className="slider-group">
            <label className="slider-label">
              Толщина обводки: {strokeWidth}
            </label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={strokeWidth}
              onChange={(e) => handleParamChange(`${prefix}StrokeWidth`, parseFloat(e.target.value))}
              className="slider"
            />
          </div>
        </>
      )}
    </>
  );

  const renderSliders = () => {
    switch (plantType) {
      case 'tree':
        return (
          <>
            <div className="slider-group">
              <label className="slider-label">
                Количество веток: {params.branches}
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={params.branches}
                onChange={(e) => handleParamChange('branches', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Длина веток: {params.length}
              </label>
              <input
                type="range"
                min="40"
                max="120"
                value={params.length}
                onChange={(e) => handleParamChange('length', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Угол веток: {params.angle}°
              </label>
              <input
                type="range"
                min="10"
                max="45"
                value={params.angle}
                onChange={(e) => handleParamChange('angle', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Толщина ствола: {params.thickness}
              </label>
              <input
                type="range"
                min="3"
                max="15"
                value={params.thickness}
                onChange={(e) => handleParamChange('thickness', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Уровни ветвления: {params.levels}
              </label>
              <input
                type="range"
                min="2"
                max="6"
                value={params.levels}
                onChange={(e) => handleParamChange('levels', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Размер листьев: {params.leafSize}
              </label>
              <input
                type="range"
                min="6"
                max="20"
                value={params.leafSize}
                onChange={(e) => handleParamChange('leafSize', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Густота листвы: {Math.round(params.leafDensity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={params.leafDensity}
                onChange={(e) => handleParamChange('leafDensity', parseFloat(e.target.value))}
                className="slider"
              />
            </div>
            <div className="color-controls">
              <div className="color-input-group">
                <label className="color-label">
                  Цвет ствола
                </label>
                <input
                  type="color"
                  value={params.color}
                  onChange={(e) => handleParamChange('color', e.target.value)}
                  className="color-input"
                />
              </div>
              <div className="color-input-group">
                <label className="color-label">
                  Цвет листьев
                </label>
                <input
                  type="color"
                  value={params.leafColor}
                  onChange={(e) => handleParamChange('leafColor', e.target.value)}
                  className="color-input"
                />
              </div>
            </div>

            {/* Градиент и обводка */}
            <div className="advanced-section">
              <h3 className="advanced-title">🎨 Дополнительно для ствола</h3>
              {renderGradientControls(
                '',
                'Ствол',
                params.GradientStartColor,
                params.GradientEndColor,
                params.UseGradient,
                params.StrokeColor,
                params.StrokeWidth,
                params.UseStroke
              )}
            </div>

            <div className="advanced-section">
              <h3 className="advanced-title">🍃 Дополнительно для листьев</h3>
              {renderGradientControls(
                'leaf',
                'Листья',
                params.leafGradientStartColor,
                params.leafGradientEndColor,
                params.leafUseGradient,
                params.leafStrokeColor,
                params.leafStrokeWidth,
                params.leafUseStroke
              )}
            </div>
          </>
        );
      case 'bush':
        return (
          <>
            <div className="slider-group">
              <label className="slider-label">
                Количество веток: {params.branches}
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={params.branches}
                onChange={(e) => handleParamChange('branches', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Длина веток: {params.length}
              </label>
              <input
                type="range"
                min="30"
                max="100"
                value={params.length}
                onChange={(e) => handleParamChange('length', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Угол веток: {params.angle}°
              </label>
              <input
                type="range"
                min="10"
                max="60"
                value={params.angle}
                onChange={(e) => handleParamChange('angle', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Толщина веток: {params.thickness}
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={params.thickness}
                onChange={(e) => handleParamChange('thickness', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Уровни ветвления: {params.levels}
              </label>
              <input
                type="range"
                min="1"
                max="4"
                value={params.levels}
                onChange={(e) => handleParamChange('levels', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Размер листьев: {params.leafSize}
              </label>
              <input
                type="range"
                min="5"
                max="15"
                value={params.leafSize}
                onChange={(e) => handleParamChange('leafSize', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Густота листвы: {Math.round(params.leafDensity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={params.leafDensity}
                onChange={(e) => handleParamChange('leafDensity', parseFloat(e.target.value))}
                className="slider"
              />
            </div>
            <div className="color-controls">
              <div className="color-input-group">
                <label className="color-label">
                  Цвет веток
                </label>
                <input
                  type="color"
                  value={params.color}
                  onChange={(e) => handleParamChange('color', e.target.value)}
                  className="color-input"
                />
              </div>
              <div className="color-input-group">
                <label className="color-label">
                  Цвет листьев
                </label>
                <input
                  type="color"
                  value={params.leafColor}
                  onChange={(e) => handleParamChange('leafColor', e.target.value)}
                  className="color-input"
                />
              </div>
            </div>

            {/* Градиент и обводка */}
            <div className="advanced-section">
              <h3 className="advanced-title">🎨 Дополнительно для веток</h3>
              {renderGradientControls(
                '',
                'Ветки',
                params.GradientStartColor,
                params.GradientEndColor,
                params.UseGradient,
                params.StrokeColor,
                params.StrokeWidth,
                params.UseStroke
              )}
            </div>

            <div className="advanced-section">
              <h3 className="advanced-title">🍃 Дополнительно для листьев</h3>
              {renderGradientControls(
                'leaf',
                'Листья',
                params.leafGradientStartColor,
                params.leafGradientEndColor,
                params.leafUseGradient,
                params.leafStrokeColor,
                params.leafStrokeWidth,
                params.leafUseStroke
              )}
            </div>
          </>
        );
      case 'flower':
        return (
          <>
            <div className="slider-group">
              <label className="slider-label">
                Количество лепестков: {params.branches}
              </label>
              <input
                type="range"
                min="3"
                max="12"
                value={params.branches}
                onChange={(e) => handleParamChange('branches', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Длина стебля: {params.length}
              </label>
              <input
                type="range"
                min="50"
                max="150"
                value={params.length}
                onChange={(e) => handleParamChange('length', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Толщина стебля: {params.thickness}
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={params.thickness}
                onChange={(e) => handleParamChange('thickness', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Размер лепестков: {params.leafSize}
              </label>
              <input
                type="range"
                min="6"
                max="20"
                value={params.leafSize}
                onChange={(e) => handleParamChange('leafSize', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Размер центра: {params.centerSize}
              </label>
              <input
                type="range"
                min="5"
                max="20"
                value={params.centerSize}
                onChange={(e) => handleParamChange('centerSize', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="color-controls">
              <div className="color-input-group">
                <label className="color-label">
                  Цвет стебля
                </label>
                <input
                  type="color"
                  value={params.color}
                  onChange={(e) => handleParamChange('color', e.target.value)}
                  className="color-input"
                />
              </div>
              <div className="color-input-group">
                <label className="color-label">
                  Цвет лепестков
                </label>
                <input
                  type="color"
                  value={params.leafColor}
                  onChange={(e) => handleParamChange('leafColor', e.target.value)}
                  className="color-input"
                />
              </div>
              <div className="color-input-group full-width">
                <label className="color-label">
                  Цвет центра
                </label>
                <input
                  type="color"
                  value={params.centerColor}
                  onChange={(e) => handleParamChange('centerColor', e.target.value)}
                  className="color-input"
                />
              </div>
            </div>

            {/* Градиент и обводка */}
            <div className="advanced-section">
              <h3 className="advanced-title">🌿 Дополнительно для стебля</h3>
              {renderGradientControls(
                '',
                'Стебель',
                params.GradientStartColor,
                params.GradientEndColor,
                params.UseGradient,
                params.StrokeColor,
                params.StrokeWidth,
                params.UseStroke
              )}
            </div>

            <div className="advanced-section">
              <h3 className="advanced-title">🌸 Дополнительно для лепестков</h3>
              {renderGradientControls(
                'leaf',
                'Лепестки',
                params.leafGradientStartColor,
                params.leafGradientEndColor,
                params.leafUseGradient,
                params.leafStrokeColor,
                params.leafStrokeWidth,
                params.leafUseStroke
              )}
            </div>

            <div className="advanced-section">
              <h3 className="advanced-title">🌼 Дополнительно для центра</h3>
              {renderGradientControls(
                'center',
                'Центр',
                params.centerGradientStartColor,
                params.centerGradientEndColor,
                params.centerUseGradient,
                params.centerStrokeColor,
                params.centerStrokeWidth,
                params.centerUseStroke
              )}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="plant-generator">
      <div className="container">
        <h1 className="main-title">
          Generate your garden
        </h1>
        
        <div className="content-layout">
          <div className="parameters-panel">
            <h2 className="panel-title">Параметры</h2>
            
            <div className="select-group">
              <label className="select-label">
                Тип растения
              </label>
              <select 
                value={plantType}
                onChange={(e) => setPlantType(e.target.value)}
                className="select-input"
              >
                <option value="tree">🌳 Дерево</option>
                <option value="flower">🌸 Цветок</option>
                <option value="bush">🌿 Куст</option>
              </select>
            </div>

            <div className="controls-section">
              {renderSliders()}
            </div>

            <button
              onClick={generatePlant}
              className="generate-btn"
            >
              🌱 Сгенерировать растение
            </button>

            <div className="download-section">
              <h3 className="download-title">
                Скачать
              </h3>
              <div className="download-buttons">
                <button
                  onClick={downloadPNG}
                  className="download-btn download-btn-png"
                >
                  PNG
                </button>
                <button
                  onClick={downloadSVG}
                  className="download-btn download-btn-svg"
                >
                  SVG
                </button>
              </div>
            </div>
          </div>

          <div className="plant-panel">
            <h2 className="panel-title">Твое растение</h2>
            <div className="canvas-container">
              <canvas
                ref={canvasRef}
                className="canvas-display"
              />
            </div>
          </div>
        </div>
        
        <footer className="footer">
          Copyright 2025{' '}
          <a
            href="https://cryptonerf.github.io/portfolio/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Emile Alexanyan
          </a>
        </footer>
      </div>
    </div>
  );
};

export default PlantGenerator;