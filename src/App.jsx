import React, { useState, useRef, useEffect, useCallback } from 'react';

const App = () => {
  const canvasRef = useRef();
  const drawingRef = useRef();
  const previewCtxRef = useRef(null);
  const drawingState = useRef({ isDrawing: false, points: [] });
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
    centerSize: 10,

    // Новые параметры для градиента и обводки
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
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [customLeafPoints, setCustomLeafPoints] = useState([]);
  const DRAWING_CANVAS_SIZE = 100;

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
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, [updateScreenSize]);

  useEffect(() => {
    generatePlant();
  }, [plantType, params, screenSize, customLeafPoints]);

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
  }, [plantType, params, getCanvasSize, customLeafPoints]);

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

    let strokeStyle = params.color;
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
    
    // ИСПРАВЛЕНО: передаем правильный угол поворота для листьев
    if (level <= 2 && Math.random() < params.leafDensity) {
      const leafRotation = angle + (Math.random() - 0.5) * Math.PI * 0.5;
      drawLeaf(ctx, endX, endY, svgElements, svgDefs, scale, leafRotation);
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

  const drawLeaf = (ctx, x, y, svgElements, svgDefs, scale = 1, rotation = Math.random() * Math.PI * 2) => {
    if (!isFinite(x) || !isFinite(y)) return;
    
    const rotDeg = rotation * 180 / Math.PI;
    let fillStyle = params.leafColor;
    let strokeStyle = params.leafStrokeColor;
    let useStroke = params.leafUseStroke;
    let strokeWidth = params.leafStrokeWidth;

    if (customLeafPoints.length === 0) {
      // Fallback to ellipse
      const rx = Math.max(2, (params.leafSize / 2) * scale);
      const ry = Math.max(3, params.leafSize * scale);

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
          `<linearGradient id="${gradientId}" gradientUnits="objectBoundingBox" x1="0" y1="0.5" x2="1" y2="0.5" gradientTransform="rotate(${rotDeg} 0.5 0.5)">
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
    } else {
      // ИСПРАВЛЕНО: Custom path с правильным позиционированием и градиентом
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      customLeafPoints.forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });
      const width = maxX - minX;
      const height = maxY - minY;
      const maxDim = Math.max(width, height);
      if (maxDim === 0) return;
      
      // ИСПРАВЛЕНО: правильный центр для кастомного листа
      const shapeCenterX = (minX + maxX) / 2;
      const shapeCenterY = (minY + maxY) / 2;
      const leafScale = (params.leafSize * scale) / maxDim;

      if (ctx) {
        ctx.save();
        ctx.translate(x, y); // Перемещаем в позицию на дереве
        ctx.rotate(rotation); // Поворачиваем лист
        ctx.scale(leafScale, leafScale); // Масштабируем
        ctx.translate(-shapeCenterX, -shapeCenterY); // ИСПРАВЛЕНО: центрируем форму листа
        
        // ИСПРАВЛЕНО: создаем градиент в правильных координатах
        let fillStyle = params.leafColor;
        if (params.leafUseGradient) {
          const gradient = ctx.createLinearGradient(minX, shapeCenterY, maxX, shapeCenterY);
          gradient.addColorStop(0, params.leafGradientStartColor);
          gradient.addColorStop(1, params.leafGradientEndColor);
          fillStyle = gradient;
        }
        
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        if (customLeafPoints.length > 0) {
          ctx.moveTo(customLeafPoints[0].x, customLeafPoints[0].y);
          for (let i = 1; i < customLeafPoints.length; i++) {
            ctx.lineTo(customLeafPoints[i].x, customLeafPoints[i].y);
          }
          ctx.closePath();
        }
        ctx.fill();
        if (useStroke) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = strokeWidth / leafScale;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Для SVG
      let svgFill = params.leafColor;
      if (params.leafUseGradient) {
        const gradientId = `leafGrad_${Math.random().toString(36).substr(2, 9)}`;
        svgDefs.push(
          `<linearGradient id="${gradientId}" gradientUnits="objectBoundingBox" x1="0" y1="0.5" x2="1" y2="0.5" gradientTransform="rotate(${rotDeg} 0.5 0.5)">
            <stop offset="0%" stop-color="${params.leafGradientStartColor}" />
            <stop offset="100%" stop-color="${params.leafGradientEndColor}" />
          </linearGradient>`
        );
        svgFill = `url(#${gradientId})`;
      }

      let d = '';
      if (customLeafPoints.length > 0) {
        d = `M ${customLeafPoints[0].x} ${customLeafPoints[0].y}`;
        for (let i = 1; i < customLeafPoints.length; i++) {
          d += ` L ${customLeafPoints[i].x} ${customLeafPoints[i].y}`;
        }
        d += ' Z';
      }

      const svgLeaf = {
        type: 'path',
        d,
        fill: svgFill,
        transform: `translate(${x} ${y}) rotate(${rotDeg}) scale(${leafScale} ${leafScale}) translate(${-shapeCenterX} ${-shapeCenterY})`
      };

      if (useStroke) {
        svgLeaf.stroke = strokeStyle;
        svgLeaf['stroke-width'] = strokeWidth;
        svgLeaf['vector-effect'] = 'non-scaling-stroke';
      }

      svgElements.push(svgLeaf);
    }
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
        ctx.strokeStyle = stemStrokeStyle;
        ctx.lineWidth = stemThickness + 2 * stemStrokeWidth;
        ctx.stroke();

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
    const petalOffset = params.leafSize * 1.5 * scale;
    
    for (let i = 0; i < petals; i++) {
      const angle = (i * Math.PI * 2) / petals;
      const petalX = centerX + Math.cos(angle) * petalOffset;
      const petalY = stemEndY + Math.sin(angle) * petalOffset;
      // ИСПРАВЛЕНО: правильная ориентация лепестков
      drawLeaf(ctx, petalX, petalY, svgElements, svgDefs, scale, angle + Math.PI/2);
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

  // Drawing functions
  const handleMouseDown = (e) => {
    drawingState.current.isDrawing = true;
    drawingState.current.points = [];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (DRAWING_CANVAS_SIZE / rect.width);
    const y = (e.clientY - rect.top) * (DRAWING_CANVAS_SIZE / rect.height);
    drawingState.current.points.push({ x, y });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!drawingState.current.isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (DRAWING_CANVAS_SIZE / rect.width);
    const y = (e.clientY - rect.top) * (DRAWING_CANVAS_SIZE / rect.height);
    drawingState.current.points.push({ x, y });
    const ctx = previewCtxRef.current;
    if (ctx) {
      ctx.clearRect(0, 0, DRAWING_CANVAS_SIZE, DRAWING_CANVAS_SIZE);
      if (drawingState.current.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(drawingState.current.points[0].x, drawingState.current.points[0].y);
        for (let i = 1; i < drawingState.current.points.length; i++) {
          ctx.lineTo(drawingState.current.points[i].x, drawingState.current.points[i].y);
        }
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = (e) => {
    drawingState.current.isDrawing = false;
    const points = [...drawingState.current.points];
    if (points.length > 1) {
      setCustomLeafPoints(points);
      const ctx = previewCtxRef.current;
      if (ctx) {
        ctx.clearRect(0, 0, DRAWING_CANVAS_SIZE, DRAWING_CANVAS_SIZE);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  };

  const handleMouseLeave = (e) => {
    if (drawingState.current.isDrawing) {
      handleMouseUp(e);
    }
  };

  const clearDrawing = () => {
    setCustomLeafPoints([]);
    drawingState.current.points = [];
    drawingState.current.isDrawing = false;
    const ctx = previewCtxRef.current;
    if (ctx) {
      ctx.clearRect(0, 0, DRAWING_CANVAS_SIZE, DRAWING_CANVAS_SIZE);
    }
  };

  const acceptDrawing = () => {
    setIsDrawingMode(false);
  };

  useEffect(() => {
    if (isDrawingMode && drawingRef.current) {
      const canvas = drawingRef.current;
      canvas.width = DRAWING_CANVAS_SIZE;
      canvas.height = DRAWING_CANVAS_SIZE;
      canvas.style.width = '100px';
      canvas.style.height = '100px';
      previewCtxRef.current = canvas.getContext('2d');
      previewCtxRef.current.clearRect(0, 0, DRAWING_CANVAS_SIZE, DRAWING_CANVAS_SIZE);
      if (customLeafPoints.length > 0) {
        const ctx = previewCtxRef.current;
        ctx.beginPath();
        ctx.moveTo(customLeafPoints[0].x, customLeafPoints[0].y);
        for (let i = 1; i < customLeafPoints.length; i++) {
          ctx.lineTo(customLeafPoints[i].x, customLeafPoints[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [isDrawingMode, customLeafPoints]);

  const downloadPNG = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Создаём временный canvas с высоким разрешением
      const scaleFactor = 4; // Увеличиваем разрешение в 4 раза для высокого качества
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      // Устанавливаем размер с учётом масштаба
      const { width: originalWidth, height: originalHeight } = getCanvasSize();
      tempCanvas.width = originalWidth * scaleFactor;
      tempCanvas.height = originalHeight * scaleFactor;
      
      // Масштабируем контекст
      tempCtx.scale(scaleFactor, scaleFactor);
      
      // Очищаем canvas
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Перерисовываем растение в высоком разрешении
      const centerX = originalWidth / 2;
      let centerY;

      switch (plantType) {
        case 'tree':
        case 'flower':
          centerY = originalHeight - Math.min(30, originalHeight * 0.1);
          break;
        case 'bush':
          centerY = originalHeight / 2;
          break;
        default:
          centerY = originalHeight - Math.min(30, originalHeight * 0.1);
      }
      
      const tempSvgElements = [];
      const tempSvgDefs = [];
      
      try {
        if (plantType === 'tree') {
          drawTree(tempCtx, centerX, centerY, params.length, -Math.PI/2, params.thickness, params.levels, tempSvgElements, tempSvgDefs);
        } else if (plantType === 'flower') {
          drawFlower(tempCtx, centerX, centerY, tempSvgElements, tempSvgDefs);
        } else if (plantType === 'bush') {
          drawBush(tempCtx, centerX, centerY, tempSvgElements, tempSvgDefs);
        }
      } catch (e) {
        console.error('Error generating high-res plant:', e);
      }
      
      // Экспортируем в высоком качестве
      const link = document.createElement('a');
      link.download = `растение-${plantType}-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL('image/png', 1.0); // Максимальное качество
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
    
    const defsStr = svgDefs.join('\n    ');
    
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
        case 'path':
          let pathStr = `<path d="${element.d}" fill="${element.fill}" transform="${element.transform}"`;
          if (element.stroke) {
            pathStr += ` stroke="${element.stroke}" stroke-width="${element['stroke-width']}" vector-effect="${element['vector-effect']}"`;
          }
          pathStr += ' />';
          return pathStr;
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
              <div className="custom-leaf-section">
                <button 
                  onClick={() => setIsDrawingMode(true)} 
                  className="custom-btn"
                >
                  🎨 Нарисовать форму листа
                </button>
              </div>
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
              <div className="custom-leaf-section">
                <button 
                  onClick={() => setIsDrawingMode(true)} 
                  className="custom-btn"
                >
                  🎨 Нарисовать форму листа
                </button>
              </div>
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
              <div className="custom-leaf-section">
                <button 
                  onClick={() => setIsDrawingMode(true)} 
                  className="custom-btn"
                >
                  🎨 Нарисовать форму лепестка
                </button>
              </div>
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

            {isDrawingMode && (
              <div className="drawing-container">
                <h4>Нарисуйте форму листа/лепестка (начните рисовать мышью, отпустите для закрытия)</h4>
                <canvas
                  ref={drawingRef}
                  width={DRAWING_CANVAS_SIZE}
                  height={DRAWING_CANVAS_SIZE}
                  style={{ border: '1px solid #ccc', cursor: 'crosshair', display: 'block', margin: '10px auto' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                />
                <div style={{ textAlign: 'center' }}>
                  <button onClick={clearDrawing} style={{ marginRight: '10px' }}>Очистить</button>
                  <button onClick={acceptDrawing}>Принять и закрыть</button>
                </div>
              </div>
            )}

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

export default App;