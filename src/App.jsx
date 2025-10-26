import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PhotoshopPicker } from 'react-color';

const App = () => {
  const canvasRef = useRef();
  const previewCanvasRef = useRef();
  const drawingRef = useRef();
  const previewCtxRef = useRef(null);
  const drawingState = useRef({ isDrawing: false, points: [] });
  const scrollPosition = useRef(0);
  const canvasRect = useRef(null);
  const [plantType, setPlantType] = useState('tree');
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [activeColorPicker, setActiveColorPicker] = useState(null);
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
  const [customLeafPoints, setCustomLeafPoints] = useState([]);
  const DRAWING_CANVAS_SIZE = 240;

  // Обработка изменения размера экрана с дебаунсом
  const updateScreenSize = useCallback(() => {
    if (typeof window !== 'undefined') {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
  }, []);

  // Дебаунс для предотвращения частых перерисовок на мобильных
  const debouncedUpdateScreenSize = useCallback(() => {
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(updateScreenSize, 300);
  }, [updateScreenSize]);

  useEffect(() => {
    updateScreenSize();
    window.addEventListener('resize', debouncedUpdateScreenSize);
    return () => {
      window.removeEventListener('resize', debouncedUpdateScreenSize);
      if (window.resizeTimeout) {
        clearTimeout(window.resizeTimeout);
      }
    };
  }, [debouncedUpdateScreenSize]);

  // Color picker closes only via OK/Cancel buttons, not by clicking outside

  useEffect(() => {
    generatePlant();
    generatePreview();
  }, [plantType, params, screenSize, customLeafPoints]);

  const generatePreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const previewSize = 300;

    canvas.width = previewSize;
    canvas.height = previewSize;

    ctx.clearRect(0, 0, previewSize, previewSize);

    const centerX = previewSize / 2;
    let centerY;

    switch (plantType) {
      case 'tree':
        centerY = previewSize * 0.85;
        break;
      case 'flower':
        centerY = previewSize * 0.75;
        break;
      case 'bush':
        centerY = previewSize * 0.55;
        break;
      default:
        centerY = previewSize * 0.85;
    }

    const tempSvgElements = [];
    const tempSvgDefs = [];

    try {
      if (plantType === 'tree') {
        drawTree(ctx, centerX, centerY, params.length * 0.8, -Math.PI/2, params.thickness * 0.8, params.levels, tempSvgElements, tempSvgDefs);
      } else if (plantType === 'flower') {
        const scaledParams = { ...params, length: params.length * 0.8, thickness: params.thickness * 0.8, leafSize: params.leafSize * 0.8, centerSize: params.centerSize * 0.8 };
        const savedParams = { ...params };
        Object.assign(params, scaledParams);
        drawFlower(ctx, centerX, centerY, tempSvgElements, tempSvgDefs);
        Object.assign(params, savedParams);
      } else if (plantType === 'bush') {
        const scaledParams = { ...params, length: params.length * 0.8, thickness: params.thickness * 0.8, leafSize: params.leafSize * 0.8 };
        const savedParams = { ...params };
        Object.assign(params, scaledParams);
        drawBush(ctx, centerX, centerY, tempSvgElements, tempSvgDefs);
        Object.assign(params, savedParams);
      }
    } catch (e) {
      console.error('Error generating preview:', e);
    }
  }, [plantType, params, customLeafPoints]);

  const getCanvasSize = useCallback(() => {
    const width = screenSize.width || (typeof window !== 'undefined' ? window.innerWidth : 600);

    // Увеличенный canvas на 20% для предотвращения обрезания
    let size;
    if (width < 320) size = 240;
    else if (width < 480) size = Math.min(width - 40, 336);
    else if (width < 640) size = Math.min(width - 60, 420);
    else if (width < 768) size = Math.min(width - 80, 480);
    else if (width < 1024) size = Math.min((width - 150) * 0.72, 456);
    else if (width < 1200) size = Math.min((width - 200) * 0.78, 480);
    else size = Math.min((width - 250) * 0.84, 540);

    return { width: size, height: size };
  }, [screenSize]);

  const generatePlant = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width: canvasWidth, height: canvasHeight } = getCanvasSize();
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    // Не устанавливаем style - пусть CSS управляет отображением

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    let centerY;

    switch (plantType) {
      case 'tree':
        centerY = canvasHeight * 0.85;
        break;
      case 'flower':
        centerY = canvasHeight * 0.75;
        break;
      case 'bush':
        centerY = canvasHeight * 0.55;
        break;
      default:
        centerY = canvasHeight * 0.85;
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
    // Для SVG нужно создавать уникальные градиенты для каждой линии с их координатами
    const gradientId = `grad_${startColor.replace('#', '')}_${endColor.replace('#', '')}_${Math.random().toString(36).substr(2, 6)}`;

    svgDefs.push(
      `<linearGradient id="${gradientId}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${startColor}" />
        <stop offset="100%" stop-color="${endColor}" />
      </linearGradient>`
    );

    const svgStyle = `url(#${gradientId})`;

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
    // Масштабируем до 0.95 для баланса между размером и обрезанием
    length = Math.max(3, Math.min(length * scale * 0.95, 190));
    thickness = Math.max(0.5, Math.min(thickness * scale * 0.95, 28.5));
    
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

      if (useStrokeOutline) {
        // Сначала обводка (толще) - рисуем снизу
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeOutlineColor;
        ctx.lineWidth = thickness + 2 * strokeOutlineWidth;
        ctx.stroke();

        // Затем основной ствол поверх (создаем градиент заново если нужно)
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        if (params.UseGradient) {
          // Создаем градиент заново для второго прохода
          const freshGradient = ctx.createLinearGradient(x, y, endX, endY);
          freshGradient.addColorStop(0, params.GradientStartColor);
          freshGradient.addColorStop(1, params.GradientEndColor);
          ctx.strokeStyle = freshGradient;
        } else {
          ctx.strokeStyle = strokeStyle;
        }
        ctx.lineWidth = thickness;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
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

      // Для SVG - используем общий градиент для всех листьев
      let svgFill = params.leafColor;
      if (params.leafUseGradient) {
        const gradientId = `leafGrad_${params.leafGradientStartColor.replace('#', '')}_${params.leafGradientEndColor.replace('#', '')}`;
        const existingGradient = svgDefs.find(def => def.includes(`id="${gradientId}"`));

        if (!existingGradient) {
          svgDefs.push(
            `<linearGradient id="${gradientId}" gradientUnits="objectBoundingBox" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stop-color="${params.leafGradientStartColor}" />
              <stop offset="100%" stop-color="${params.leafGradientEndColor}" />
            </linearGradient>`
          );
        }
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

      // Для SVG - используем общий градиент для всех листьев
      let svgFill = params.leafColor;
      if (params.leafUseGradient) {
        const gradientId = `leafGrad_${params.leafGradientStartColor.replace('#', '')}_${params.leafGradientEndColor.replace('#', '')}`;
        const existingGradient = svgDefs.find(def => def.includes(`id="${gradientId}"`));

        if (!existingGradient) {
          svgDefs.push(
            `<linearGradient id="${gradientId}" gradientUnits="objectBoundingBox" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stop-color="${params.leafGradientStartColor}" />
              <stop offset="100%" stop-color="${params.leafGradientEndColor}" />
            </linearGradient>`
          );
        }
        svgFill = `url(#${gradientId})`;
      }

      let d = '';
      if (customLeafPoints.length > 0) {
        d = `M ${customLeafPoints[0].x.toFixed(1)} ${customLeafPoints[0].y.toFixed(1)}`;
        for (let i = 1; i < customLeafPoints.length; i++) {
          d += ` L ${customLeafPoints[i].x.toFixed(1)} ${customLeafPoints[i].y.toFixed(1)}`;
        }
        d += ' Z';
      }

      const svgLeaf = {
        type: 'path',
        d,
        fill: svgFill,
        transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotDeg.toFixed(1)}) scale(${leafScale.toFixed(3)} ${leafScale.toFixed(3)}) translate(${(-shapeCenterX).toFixed(1)} ${(-shapeCenterY).toFixed(1)})`
      };

      if (useStroke) {
        svgLeaf.stroke = strokeStyle;
        svgLeaf['stroke-width'] = strokeWidth.toFixed(2);
        svgLeaf['vector-effect'] = 'non-scaling-stroke';
      }

      svgElements.push(svgLeaf);
    }
  };

  const drawFlower = (ctx, centerX, centerY, svgElements, svgDefs) => {
    if (!isFinite(centerX) || !isFinite(centerY)) return;

    const scale = Math.min(screenSize.width || 600, 600) / 600;
    // Масштабируем до 0.95 для баланса
    const stemLength = Math.max(30, Math.min(params.length * scale * 0.95, 237.5));
    const stemEndY = centerY - stemLength;
    const stemThickness = Math.max(2, Math.min(params.thickness * scale * 0.95, 14.25));
    
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
    const petalOffset = params.leafSize * 1.5 * scale * 0.95;
    
    for (let i = 0; i < petals; i++) {
      const angle = (i * Math.PI * 2) / petals;
      const petalX = centerX + Math.cos(angle) * petalOffset;
      const petalY = stemEndY + Math.sin(angle) * petalOffset;
      // ИСПРАВЛЕНО: правильная ориентация лепестков
      drawLeaf(ctx, petalX, petalY, svgElements, svgDefs, scale, angle + Math.PI/2);
    }
    
    const centerRadius = Math.max(3, Math.min(params.centerSize * scale * 0.95, 23.75));
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
      // Масштабируем до 0.95 для баланса
      const length = Math.max(25, params.length * (0.5 + Math.random() * 0.4) * scale * 0.95);
      const thickness = Math.max(1, params.thickness * 0.6 * scale * 0.95);
      
      drawTree(ctx, centerX, centerY, length, angle - Math.PI/2, thickness, 
        Math.max(1, Math.min(params.levels, 4)), svgElements, svgDefs);
    }
  };

  const handleParamChange = (param, value) => {
    setParams(prev => ({ ...prev, [param]: value }));
  };

  const generateRandomParams = () => {
    const getRandomColor = () => {
      const colors = [
        '#8B4513', '#A0522D', '#DEB887', '#CD853F', '#D2B48C', '#F4A460', '#228B22', 
        '#32CD32', '#7CFC00', '#9ACD32', '#6B8E23', '#008000', '#FFD700', '#FFA500',
        '#FF6347', '#DC143C', '#8A2BE2', '#4B0082', '#800080', '#FF1493'
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    };

    const randomBetween = (min, max, step = 1) => {
      const range = (max - min) / step;
      return min + Math.floor(Math.random() * (range + 1)) * step;
    };

    let newParams = { ...params };

    // Генерируем цвета заранее для консистентности
    const trunkColor = getRandomColor();
    const leafColor1 = getRandomColor();
    const leafColor2 = getRandomColor();

    switch (plantType) {
      case 'tree':
        newParams = {
          ...newParams,
          branches: randomBetween(2, 8),
          length: randomBetween(40, 120),
          angle: randomBetween(10, 45),
          thickness: randomBetween(3, 15),
          levels: randomBetween(2, 6),
          leafSize: randomBetween(6, 20),
          leafDensity: randomBetween(0, 10, 1) / 10,
          color: trunkColor,
          leafColor: leafColor1
        };
        break;
      case 'bush':
        newParams = {
          ...newParams,
          branches: randomBetween(2, 10),
          length: randomBetween(30, 100),
          angle: randomBetween(10, 60),
          thickness: randomBetween(2, 10),
          levels: randomBetween(1, 4),
          leafSize: randomBetween(5, 15),
          leafDensity: randomBetween(0, 10, 1) / 10,
          color: trunkColor,
          leafColor: leafColor1
        };
        break;
      case 'flower':
        newParams = {
          ...newParams,
          branches: randomBetween(3, 12),
          length: randomBetween(50, 150),
          thickness: randomBetween(2, 10),
          leafSize: randomBetween(6, 20),
          centerSize: randomBetween(5, 20),
          color: trunkColor,
          leafColor: leafColor1,
          centerColor: getRandomColor()
        };
        break;
    }

    // Случайные градиенты и обводки - используем те же цвета
    const useGradient = Math.random() < 0.3;
    const useStroke = Math.random() < 0.2;
    const leafUseGradient = Math.random() < 0.3;
    const leafUseStroke = Math.random() < 0.2;

    newParams.UseGradient = useGradient;
    newParams.GradientStartColor = trunkColor;
    newParams.GradientEndColor = getRandomColor();
    newParams.UseStroke = useStroke;
    newParams.StrokeColor = getRandomColor();
    newParams.StrokeWidth = randomBetween(1, 10, 1) / 2;

    newParams.leafUseGradient = leafUseGradient;
    newParams.leafGradientStartColor = leafColor1;
    newParams.leafGradientEndColor = leafColor2;
    newParams.leafUseStroke = leafUseStroke;
    newParams.leafStrokeColor = getRandomColor();
    newParams.leafStrokeWidth = randomBetween(1, 10, 1) / 2;

    if (plantType === 'flower') {
      const centerUseGradient = Math.random() < 0.3;
      const centerUseStroke = Math.random() < 0.2;
      newParams.centerUseGradient = centerUseGradient;
      newParams.centerGradientStartColor = getRandomColor();
      newParams.centerGradientEndColor = getRandomColor();
      newParams.centerUseStroke = centerUseStroke;
      newParams.centerStrokeColor = getRandomColor();
      newParams.centerStrokeWidth = randomBetween(1, 10, 1) / 2;
    }

    setParams(newParams);
  };

  // Drawing functions с поддержкой touch событий - УПРОЩЁННАЯ ВЕРСИЯ
  const getEventPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      // Touch событие
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      // TouchEnd событие
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      // Mouse событие
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * (DRAWING_CANVAS_SIZE / rect.width);
    const y = (clientY - rect.top) * (DRAWING_CANVAS_SIZE / rect.height);

    // Ограничиваем координаты границами canvas
    const clampedX = Math.max(0, Math.min(x, DRAWING_CANVAS_SIZE));
    const clampedY = Math.max(0, Math.min(y, DRAWING_CANVAS_SIZE));

    return { x: clampedX, y: clampedY };
  };

  const handleDrawStart = (e) => {
    drawingState.current.isDrawing = true;
    drawingState.current.points = [];

    const pos = getEventPos(e, e.currentTarget);
    drawingState.current.points.push(pos);

    // Простая блокировка только для canvas wrapper
    const wrapper = e.currentTarget.parentElement;
    if (wrapper) {
      wrapper.style.touchAction = 'none';
    }

    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrawMove = (e) => {
    if (!drawingState.current.isDrawing) return;

    const pos = getEventPos(e, e.currentTarget);

    // Добавляем точку только если она отличается от предыдущей
    const lastPoint = drawingState.current.points[drawingState.current.points.length - 1];
    if (!lastPoint || Math.abs(pos.x - lastPoint.x) > 0.5 || Math.abs(pos.y - lastPoint.y) > 0.5) {
      drawingState.current.points.push(pos);
    }

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
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrawEnd = (e) => {
    drawingState.current.isDrawing = false;

    // Возвращаем touch-action
    const wrapper = e.currentTarget.parentElement;
    if (wrapper) {
      wrapper.style.touchAction = '';
    }

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
    e.preventDefault();
    e.stopPropagation();
  };

  // Старые функции заменены на новые выше
  const handleMouseDown = handleDrawStart;
  const handleMouseMove = handleDrawMove;
  const handleMouseUp = handleDrawEnd;

  const handleMouseLeave = (e) => {
    if (drawingState.current.isDrawing) {
      handleDrawEnd(e);
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

  useEffect(() => {
    if (drawingRef.current) {
      const canvas = drawingRef.current;
      canvas.width = DRAWING_CANVAS_SIZE;
      canvas.height = DRAWING_CANVAS_SIZE;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
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
  }, [customLeafPoints]);

  const downloadPNG = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Используем точные размеры отображаемого canvas
      const displayWidth = canvas.width;
      const displayHeight = canvas.height;

      // Создаём временный canvas с высоким разрешением
      const scaleFactor = 4;
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      // Устанавливаем размер с учётом масштаба
      tempCanvas.width = displayWidth * scaleFactor;
      tempCanvas.height = displayHeight * scaleFactor;

      // Масштабируем контекст
      tempCtx.scale(scaleFactor, scaleFactor);

      // Очищаем canvas
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

      // Перерисовываем растение с теми же координатами
      const centerX = displayWidth / 2;
      let centerY;

      switch (plantType) {
        case 'tree':
          centerY = displayHeight * 0.85;
          break;
        case 'flower':
          centerY = displayHeight * 0.75;
          break;
        case 'bush':
          centerY = displayHeight * 0.55;
          break;
        default:
          centerY = displayHeight * 0.85;
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
            // Сначала обводка (снизу)
            lineStr += `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${element.strokeOutline.color}" stroke-width="${outlineWidth}" stroke-linecap="${element.strokeLinecap || 'round'}" />\n    `;
            // Затем основная линия поверх (с градиентом если есть)
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
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="plant-generator">
      <div className="main-container">
        {/* Левая панель с пресетами */}
        <aside className="presets-sidebar">
          <div
            className={`preset-item ${plantType === 'tree' ? 'active' : ''}`}
            onClick={() => setPlantType('tree')}
          >
            <img src="/assets/preset-tree.png" alt="Tree" />
          </div>
          <div
            className={`preset-item ${plantType === 'flower' ? 'active' : ''}`}
            onClick={() => setPlantType('flower')}
          >
            <img src="/assets/preset-flower.png" alt="Flower" />
          </div>
          <div
            className={`preset-item ${plantType === 'bush' ? 'active' : ''}`}
            onClick={() => setPlantType('bush')}
          >
            <img src="/assets/preset-bush.png" alt="Bush" />
          </div>
        </aside>

        {/* Центральная область с растением */}
        <main className="plant-display-area">
          <div className="plant-canvas-wrapper">
            <div className="generator-wrapper">
              {/* Фоновый SVG - разный для десктопа и мобильных */}
              <img src="/assets/GardenGenerator.svg" alt="Generator" className="generator-bg-image desktop-generator" />
              <img src="/assets/PhoneGenerator.svg" alt="Generator" className="generator-bg-image mobile-generator" />

              {/* Цветные кружки */}
              <div className="color-picker-circles">
                <div
                  className="color-circle-wrapper color-circle-1"
                  style={{
                    position: 'absolute',
                    left: '41.7%',
                    top: '4.18%',
                    width: '3.65%',
                    aspectRatio: '1',
                  }}
                >
                  <div
                    className="color-circle"
                    style={{ background: params.leafGradientStartColor }}
                    onClick={() => setActiveColorPicker(activeColorPicker === 'leafGradientStartColor' ? null : 'leafGradientStartColor')}
                  />
                </div>

                <div
                  className="color-circle-wrapper color-circle-2"
                  style={{
                    position: 'absolute',
                    left: '52.1%',
                    top: '8%',
                    width: '10.4%',
                    aspectRatio: '1',
                  }}
                >
                  <div
                    className="color-circle"
                    style={{ background: params.leafGradientEndColor }}
                    onClick={() => setActiveColorPicker(activeColorPicker === 'leafGradientEndColor' ? null : 'leafGradientEndColor')}
                  />
                </div>

                <div
                  className="color-circle-wrapper color-circle-3"
                  style={{
                    position: 'absolute',
                    left: '68.45%',
                    top: '82.9%',
                    width: '8.1%',
                    aspectRatio: '1',
                  }}
                >
                  <div
                    className="color-circle"
                    style={{ background: params.GradientEndColor }}
                    onClick={() => setActiveColorPicker(activeColorPicker === 'GradientEndColor' ? null : 'GradientEndColor')}
                  />
                </div>

                <div
                  className="color-circle-wrapper color-circle-4"
                  style={{
                    position: 'absolute',
                    left: '80.14%',
                    top: '93.5%',
                    width: '2.8%',
                    aspectRatio: '1',
                  }}
                >
                  <div
                    className="color-circle"
                    style={{ background: params.GradientStartColor }}
                    onClick={() => setActiveColorPicker(activeColorPicker === 'GradientStartColor' ? null : 'GradientStartColor')}
                  />
                </div>
              </div>

              {/* Canvas для растения с liquid glass эффектом */}
              <div className="canvas-glass-wrapper">
                <div className="liquidGlass-effect"></div>
                <div className="liquidGlass-tint"></div>
                <div className="liquidGlass-shine"></div>
                <canvas ref={canvasRef} className="canvas-display" />
              </div>
            </div>

            {/* Мобильные кнопки пресетов (видны только на мобильных) */}
            <div className="mobile-presets">
              <div
                className={`mobile-preset-item ${plantType === 'tree' ? 'active' : ''}`}
                onClick={() => setPlantType('tree')}
              >
                <img src="/assets/preset-tree.png" alt="Tree" />
              </div>
              <div
                className={`mobile-preset-item ${plantType === 'flower' ? 'active' : ''}`}
                onClick={() => setPlantType('flower')}
              >
                <img src="/assets/preset-flower.png" alt="Flower" />
              </div>
              <div
                className={`mobile-preset-item ${plantType === 'bush' ? 'active' : ''}`}
                onClick={() => setPlantType('bush')}
              >
                <img src="/assets/preset-bush.png" alt="Bush" />
              </div>
            </div>
          </div>
        </main>

        {/* Правая панель с параметрами */}
        <aside className="parameters-sidebar">
          <h2 className="parameters-title">Параметры</h2>

          {/* Слайдеры */}
          <div className="controls-section">
            {renderSliders()}
          </div>

          {/* Чекбоксы обводки */}
          <div className="outline-checkboxes">
            <div className="checkbox-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={params.UseStroke}
                  onChange={(e) => handleParamChange('UseStroke', e.target.checked)}
                  className="checkbox-input"
                />
                Обводка ствола
              </label>
              {params.UseStroke && (
                <>
                  <div className="color-picker-panel">
                    <input
                      type="color"
                      value={params.StrokeColor}
                      onChange={(e) => handleParamChange('StrokeColor', e.target.value)}
                      className="color-input-small"
                    />
                  </div>
                  <div className="stroke-width-slider">
                    <label className="slider-label-small">
                      Толщина: {params.StrokeWidth}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={params.StrokeWidth}
                      onChange={(e) => handleParamChange('StrokeWidth', parseFloat(e.target.value))}
                      className="slider-small"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="checkbox-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={params.leafUseStroke}
                  onChange={(e) => handleParamChange('leafUseStroke', e.target.checked)}
                  className="checkbox-input"
                />
                Обводка листвы
              </label>
              {params.leafUseStroke && (
                <>
                  <div className="color-picker-panel">
                    <input
                      type="color"
                      value={params.leafStrokeColor}
                      onChange={(e) => handleParamChange('leafStrokeColor', e.target.value)}
                      className="color-input-small"
                    />
                  </div>
                  <div className="stroke-width-slider">
                    <label className="slider-label-small">
                      Толщина: {params.leafStrokeWidth}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={params.leafStrokeWidth}
                      onChange={(e) => handleParamChange('leafStrokeWidth', parseFloat(e.target.value))}
                      className="slider-small"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Цвет центра цветка (только для flower) */}
            {plantType === 'flower' && (
              <div className="checkbox-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={params.centerUseGradient}
                    onChange={(e) => handleParamChange('centerUseGradient', e.target.checked)}
                    className="checkbox-input"
                  />
                  Градиент центра
                </label>
                {params.centerUseGradient && (
                  <div className="color-picker-panel">
                    <label className="slider-label-small">Основной:</label>
                    <input
                      type="color"
                      value={params.centerGradientStartColor}
                      onChange={(e) => handleParamChange('centerGradientStartColor', e.target.value)}
                      className="color-input-small"
                    />
                    <label className="slider-label-small">Градиент:</label>
                    <input
                      type="color"
                      value={params.centerGradientEndColor}
                      onChange={(e) => handleParamChange('centerGradientEndColor', e.target.value)}
                      className="color-input-small"
                    />
                  </div>
                )}
                {!params.centerUseGradient && (
                  <div className="color-picker-panel">
                    <label className="slider-label-small">Цвет:</label>
                    <input
                      type="color"
                      value={params.centerColor}
                      onChange={(e) => handleParamChange('centerColor', e.target.value)}
                      className="color-input-small"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PhotoshopPicker встроенный в панель */}
          {activeColorPicker && (
            <div className="photoshop-picker-wrapper">
              <PhotoshopPicker
                color={
                  activeColorPicker === 'leafGradientStartColor' ? params.leafGradientStartColor :
                  activeColorPicker === 'leafGradientEndColor' ? params.leafGradientEndColor :
                  activeColorPicker === 'GradientEndColor' ? params.GradientEndColor :
                  params.GradientStartColor
                }
                onAccept={() => setActiveColorPicker(null)}
                onCancel={() => setActiveColorPicker(null)}
                onChange={(color) => {
                  handleParamChange(activeColorPicker, color.hex);
                  if (activeColorPicker.includes('leaf')) {
                    handleParamChange('leafUseGradient', true);
                  } else {
                    handleParamChange('UseGradient', true);
                  }
                }}
              />
            </div>
          )}

          {/* Кнопки управления */}
          <div className="action-buttons">
            <button onClick={generateRandomParams} className="btn-random">
              random
            </button>
            <button onClick={generatePlant} className="btn-generate">
              сгенерировать
            </button>
          </div>

          {/* Drawing canvas - всегда видимый */}
          <div className="drawing-canvas-wrapper">
            <img
              src="/assets/list.svg"
              alt="Draw leaf"
              className={`drawing-placeholder ${customLeafPoints.length > 0 ? 'hidden' : ''}`}
            />
            <canvas
              ref={drawingRef}
              width={DRAWING_CANVAS_SIZE}
              height={DRAWING_CANVAS_SIZE}
              className="drawing-canvas"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleDrawStart}
              onTouchMove={handleDrawMove}
              onTouchEnd={handleDrawEnd}
              onTouchCancel={handleDrawEnd}
            />
          </div>

          {/* Кнопка управления drawing */}
          <div className="drawing-actions">
            <button onClick={clearDrawing} className="btn-drawing btn-drawing-full">стереть</button>
          </div>

          {/* Кнопки скачивания */}
          <div className="download-section">
            <p className="download-label">Сохранить как:</p>
            <div className="download-buttons">
              <button onClick={downloadPNG} className="btn-download">PNG</button>
              <button onClick={downloadSVG} className="btn-download">SVG</button>
            </div>
          </div>

          {/* Ссылка на галерею */}
          <div className="share-section">
            <p className="share-text">Поделись растением на</p>
            <a href="https://html-garden.vercel.app/" target="_blank" rel="noopener noreferrer" className="share-link">
              <img src="/assets/html-garden.png" alt="HTML Garden" className="share-logo" />
            </a>
          </div>
        </aside>
      </div>

      {/* SVG Filter for Liquid Glass Effect */}
      <svg style={{position: 'absolute', width: 0, height: 0}}>
        <defs>
          <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
            <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="1" seed="5" result="turbulence" />

            <feComponentTransfer in="turbulence" result="mapped">
              <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
              <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
              <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
            </feComponentTransfer>

            <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />

            <feSpecularLighting
              in="softMap"
              surfaceScale="5"
              specularConstant="1"
              specularExponent="100"
              lightingColor="white"
              result="specLight"
            >
              <fePointLight x="-200" y="-200" z="300" />
            </feSpecularLighting>

            <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />

            <feDisplacementMap in="SourceGraphic" in2="softMap" scale="150" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default App;