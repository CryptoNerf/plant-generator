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
  const [isMobile, setIsMobile] = useState(false);
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

    // Тип ствола/стебля
    trunkType: 'straight', // 'straight', 'organic', 'segmented'

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

    // Параметры для травы
    blades: 12,
    curvature: 0.7,
    spread: 60,
    windDirection: 15,
    grassType: 'regular', // 'regular', 'wheat', 'wild', 'fern', 'clover', 'dandelion', 'chamomile', 'cornflower', 'bellflower'

    // Параметры цветов для трав
    flowerSize: 12,
    petalCount: 8,
    flowerColor: '#FFFFFF',
    flowerCenterColor: '#FFD700',
    dandelionFluffy: false, // для одуванчика: false = желтый, true = пушистый
    bellCount: 3, // количество колокольчиков
  });

  const [svgElements, setSvgElements] = useState([]);
  const [svgDefs, setSvgDefs] = useState([]);
  const [customLeafPoints, setCustomLeafPoints] = useState([]);
  const [randomSeed, setRandomSeed] = useState(0);
  const DRAWING_CANVAS_SIZE = 240;

  // Обработка изменения размера экрана с дебаунсом
  const updateScreenSize = useCallback(() => {
    if (typeof window !== 'undefined') {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      setIsMobile(window.innerWidth <= 1024);
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
  }, [plantType, params, screenSize, customLeafPoints, randomSeed]);

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
        // На компьютере дерево выше, на мобильных ниже
        centerY = previewSize * (isMobile ? 0.85 : 0.80);
        break;
      case 'flower':
        centerY = previewSize * 0.75;
        break;
      case 'bush':
        centerY = previewSize * 0.55;
        break;
      case 'grass':
        centerY = previewSize * 0.75;
        break;
      default:
        centerY = previewSize * (isMobile ? 0.85 : 0.80);
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
      } else if (plantType === 'grass') {
        const scaledParams = { ...params, length: params.length * 0.8, thickness: params.thickness * 0.8, spread: params.spread * 0.8 };
        const savedParams = { ...params };
        Object.assign(params, scaledParams);
        drawGrass(ctx, centerX, centerY, tempSvgElements, tempSvgDefs);
        Object.assign(params, savedParams);
      }
    } catch (e) {
      console.error('Error generating preview:', e);
    }
  }, [plantType, params, customLeafPoints, randomSeed]);

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
        // На компьютере дерево выше, на мобильных ниже
        centerY = canvasHeight * (isMobile ? 0.85 : 0.80);
        break;
      case 'flower':
        centerY = canvasHeight * 0.75;
        break;
      case 'bush':
        centerY = canvasHeight * 0.55;
        break;
      case 'grass':
        centerY = canvasHeight * 0.75;
        break;
      default:
        centerY = canvasHeight * (isMobile ? 0.85 : 0.80);
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
      } else if (plantType === 'grass') {
        drawGrass(ctx, centerX, centerY, tempSvgElements, tempSvgDefs);
      }
    } catch (e) {
      console.error('Error generating plant:', e);
    }
    
    setSvgElements(tempSvgElements);
    setSvgDefs(tempSvgDefs);
  }, [plantType, params, getCanvasSize, customLeafPoints, randomSeed]);

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

  // Функция для рисования прямого ствола (текущий вариант)
  const drawStraightTrunk = (ctx, x, y, endX, endY, thickness, strokeStyle, svgStroke, useStrokeOutline, strokeOutlineColor, strokeOutlineWidth, svgElements) => {
    if (ctx) {
      ctx.lineCap = 'round';

      if (useStrokeOutline) {
        // Сначала обводка
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeOutlineColor;
        ctx.lineWidth = thickness + 2 * strokeOutlineWidth;
        ctx.stroke();

        // Затем основной ствол поверх
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        if (params.UseGradient) {
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
  };

  // Детерминированный псевдо-random на основе координат и seed
  const seededRandom = (x, y) => {
    const seed = Math.sin(x * 12.9898 + y * 78.233 + randomSeed * 43758.5453) * 43758.5453;
    return seed - Math.floor(seed);
  };

  // Функция для рисования органического ствола с изгибами (quadratic curve)
  const drawOrganicTrunk = (ctx, x, y, endX, endY, thickness, strokeStyle, svgStroke, useStrokeOutline, strokeOutlineColor, strokeOutlineWidth, svgElements) => {
    // Создаем контрольную точку для изгиба
    const midX = (x + endX) / 2;
    const midY = (y + endY) / 2;
    const angle = Math.atan2(endY - y, endX - x);
    const perpAngle = angle + Math.PI / 2;
    const length = Math.sqrt((endX - x) ** 2 + (endY - y) ** 2);
    // Используем детерминированный random на основе координат
    const randomValue = seededRandom(x + y, endX + endY) - 0.5;
    const offset = randomValue * Math.max(length * 0.3, thickness * 3);
    const ctrlX = midX + Math.cos(perpAngle) * offset;
    const ctrlY = midY + Math.sin(perpAngle) * offset;

    if (ctx) {
      ctx.lineCap = 'round';

      if (useStrokeOutline) {
        // Обводка
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.strokeStyle = strokeOutlineColor;
        ctx.lineWidth = thickness + 2 * strokeOutlineWidth;
        ctx.stroke();

        // Основная линия
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        if (params.UseGradient) {
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
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = thickness;
        ctx.stroke();
      }
    }

    // SVG элемент с quadratic curve
    const pathD = `M ${x} ${y} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
    const svgPath = {
      type: 'path',
      d: pathD,
      stroke: svgStroke,
      fill: 'none',
      strokeWidth: thickness,
      strokeLinecap: 'round'
    };

    if (useStrokeOutline) {
      svgPath.strokeOutline = {
        color: strokeOutlineColor,
        width: strokeOutlineWidth
      };
    }

    svgElements.push(svgPath);
  };


  const drawTree = (ctx, x, y, length, angle, thickness, level, svgElements, svgDefs) => {
    if (level <= 0 || length < 3 || thickness < 0.5 || level > 8) return;

    const scale = Math.min(screenSize.width || 600, 600) / 600;
    // Адаптивный масштаб в зависимости от ширины экрана
    let scaleFactor = 0.95; // desktop по умолчанию
    const width = screenSize.width || 600;
    if (width <= 470) {
      scaleFactor = 1.15; // маленькие телефоны
    } else if (width <= 520) {
      scaleFactor = 1.05; // средние телефоны
    } else if (width <= 640) {
      scaleFactor = 0.95; // большие телефоны
    } else if (width <= 768) {
      scaleFactor = 0.92; // маленькие планшеты
    } else if (width <= 1024) {
      scaleFactor = 0.9; // большие планшеты/маленькие ноутбуки
    }
    length = Math.max(3, Math.min(length * scale * scaleFactor, 190));
    thickness = Math.max(0.5, Math.min(thickness * scale * scaleFactor, 28.5));
    
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

    // Выбираем функцию рисования в зависимости от типа ствола
    switch (params.trunkType) {
      case 'organic':
        drawOrganicTrunk(ctx, x, y, endX, endY, thickness, strokeStyle, svgStroke, useStrokeOutline, strokeOutlineColor, strokeOutlineWidth, svgElements);
        break;
      case 'straight':
      default:
        drawStraightTrunk(ctx, x, y, endX, endY, thickness, strokeStyle, svgStroke, useStrokeOutline, strokeOutlineColor, strokeOutlineWidth, svgElements);
        break;
    }
    
    // ИСПРАВЛЕНО: передаем правильный угол поворота для листьев
    // Используем детерминированную генерацию для листьев
    const leafRandom1 = seededRandom(endX + endY, x + y);
    const leafRandom2 = seededRandom(endX * 2, endY * 2);
    if (level <= 2 && leafRandom1 < params.leafDensity) {
      const leafRotation = angle + (leafRandom2 - 0.5) * Math.PI * 0.5;
      drawLeaf(ctx, endX, endY, svgElements, svgDefs, scale, leafRotation);
    }
    
    const newLength = length * 0.75;
    const newThickness = Math.max(0.5, thickness * 0.7);
    const angleStep = params.angle * Math.PI / 180;
    const maxBranches = params.branches;

    for (let i = 0; i < maxBranches; i++) {
      // Используем детерминированную генерацию для углов веток
      const branchRandom = seededRandom(endX + i * 50, endY + level * 100);
      const branchAngle = angle + (angleStep * (i - maxBranches/2 + 0.5)) + (branchRandom - 0.5) * 0.2;
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
    // Адаптивный масштаб в зависимости от ширины экрана
    let scaleFactor = 0.95; // desktop по умолчанию
    const width = screenSize.width || 600;
    if (width <= 470) {
      scaleFactor = 1.15; // маленькие телефоны
    } else if (width <= 520) {
      scaleFactor = 1.05; // средние телефоны
    } else if (width <= 640) {
      scaleFactor = 0.95; // большие телефоны
    } else if (width <= 768) {
      scaleFactor = 0.92; // маленькие планшеты
    } else if (width <= 1024) {
      scaleFactor = 0.9; // большие планшеты/маленькие ноутбуки
    }
    const stemLength = Math.max(30, Math.min(params.length * scale * scaleFactor, 237.5));
    const stemEndY = centerY - stemLength;
    const stemThickness = Math.max(2, Math.min(params.thickness * scale * scaleFactor, 14.25));
    
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

    // Рисуем стебель используя выбранный тип ствола
    switch (params.trunkType) {
      case 'organic':
        drawOrganicTrunk(ctx, centerX, centerY, centerX, stemEndY, stemThickness, stemFillStyle, svgStemStroke, stemUseStroke, stemStrokeStyle, stemStrokeWidth, svgElements);
        break;
      case 'straight':
      default:
        drawStraightTrunk(ctx, centerX, centerY, centerX, stemEndY, stemThickness, stemFillStyle, svgStemStroke, stemUseStroke, stemStrokeStyle, stemStrokeWidth, svgElements);
        break;
    }
    
    const petals = Math.max(3, Math.min(params.branches, 15));
    const petalOffset = params.leafSize * 1.5 * scale * scaleFactor;

    // Адаптивный масштаб листьев для разных экранов
    let leafScale = 1;
    if (width <= 470) {
      leafScale = 1.21; // маленькие телефоны
    } else if (width <= 520) {
      leafScale = 1.1; // средние телефоны
    } else if (width <= 640) {
      leafScale = 1.0; // большие телефоны
    } else if (width <= 768) {
      leafScale = 0.97; // маленькие планшеты
    } else if (width <= 1024) {
      leafScale = 0.95; // большие планшеты/маленькие ноутбуки
    }

    for (let i = 0; i < petals; i++) {
      const angle = (i * Math.PI * 2) / petals;
      const petalX = centerX + Math.cos(angle) * petalOffset;
      const petalY = stemEndY + Math.sin(angle) * petalOffset;
      // ИСПРАВЛЕНО: правильная ориентация лепестков
      drawLeaf(ctx, petalX, petalY, svgElements, svgDefs, scale * leafScale, angle + Math.PI/2);
    }

    const centerRadius = Math.max(3, Math.min(params.centerSize * scale * scaleFactor, 23.75));
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

    const branches = Math.max(4, Math.min(params.branches * 2, 20));
    const scale = Math.min(screenSize.width || 600, 600) / 600;
    // Адаптивный масштаб в зависимости от ширины экрана
    let scaleFactor = 0.95; // desktop по умолчанию
    const width = screenSize.width || 600;
    if (width <= 470) {
      scaleFactor = 1.15; // маленькие телефоны
    } else if (width <= 520) {
      scaleFactor = 1.05; // средние телефоны
    } else if (width <= 640) {
      scaleFactor = 0.95; // большие телефоны
    } else if (width <= 768) {
      scaleFactor = 0.92; // маленькие планшеты
    } else if (width <= 1024) {
      scaleFactor = 0.9; // большие планшеты/маленькие ноутбуки
    }

    for (let i = 0; i < branches; i++) {
      // Используем детерминированную генерацию на основе индекса ветки
      const angleRandom = seededRandom(i * 100, centerX + centerY);
      const lengthRandom = seededRandom(i * 200 + 1, centerX + centerY);

      const angle = angleRandom * Math.PI * 2;
      const length = Math.max(25, params.length * (0.5 + lengthRandom * 0.4) * scale * scaleFactor);
      const thickness = Math.max(1, params.thickness * 0.6 * scale * scaleFactor);

      drawTree(ctx, centerX, centerY, length, angle - Math.PI/2, thickness,
        Math.max(1, Math.min(params.levels, 4)), svgElements, svgDefs);
    }
  };

  // Клевер - круглые пушистые цветы с тройными листочками
  const drawGrassClover = (ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor) => {
    const blades = Math.max(3, Math.min(params.blades, 15));
    const maxHeight = Math.max(60, Math.min(params.length * scale * scaleFactor, 250));
    const spreadWidth = Math.max(20, Math.min(params.spread * scale * scaleFactor, 150));
    const windAngle = (params.windDirection * Math.PI) / 180;
    const flowerSize = Math.max(8, Math.min(params.flowerSize * scale * scaleFactor, 25));

    for (let i = 0; i < blades; i++) {
      const heightRandom = seededRandom(i * 123, centerX + centerY);
      const posRandom = seededRandom(i * 456, centerX + centerY + 100);
      const thicknessRandom = seededRandom(i * 321, centerX + centerY + 300);

      const stemHeight = maxHeight * (0.7 + heightRandom * 0.3);
      const xOffset = (posRandom - 0.5) * spreadWidth;
      const startX = centerX + xOffset;
      const startY = centerY;
      const stemThickness = Math.max(0.8, Math.min(params.thickness * 0.25 * scale * scaleFactor, 2));

      // Точка цветка
      const flowerX = startX + Math.sin(windAngle) * stemHeight * 0.15;
      const flowerY = startY - stemHeight;

      let strokeStyle = params.color;
      let svgStroke = params.color;

      if (params.UseGradient) {
        const gradientId = `cloverStem_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const grad = createGradient(ctx, startX, startY, flowerX, flowerY, params.GradientStartColor, params.GradientEndColor, gradientId, svgDefs);
        strokeStyle = grad.canvasStyle;
        svgStroke = grad.svgStyle;
      }

      // Рисуем стебель с поддержкой градиентов и обводки
      if (ctx) {
        ctx.lineCap = 'round';
        if (params.UseStroke) {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(flowerX, flowerY);
          ctx.strokeStyle = params.StrokeColor;
          ctx.lineWidth = stemThickness + 2 * params.StrokeWidth;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(flowerX, flowerY);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = stemThickness;
        ctx.stroke();
      }

      // SVG стебель
      const svgLine = {
        type: 'line',
        x1: startX, y1: startY, x2: flowerX, y2: flowerY,
        stroke: svgStroke,
        strokeWidth: stemThickness,
        strokeLinecap: 'round'
      };
      if (params.UseStroke) {
        svgLine.strokeOutline = { color: params.StrokeColor, width: params.StrokeWidth };
      }
      svgElements.push(svgLine);

      // Рисуем пушистый круглый цветок (множество маленьких кружков с вариацией размера)
      const fluffCount = 20 + Math.floor(seededRandom(i * 789, centerX) * 15);

      let flowerFill = params.flowerColor || '#FF69B4';
      let svgFlowerFill = flowerFill;

      for (let j = 0; j < fluffCount; j++) {
        const angle = (j / fluffCount) * Math.PI * 2 + seededRandom(i * 111 + j, centerY) * 0.5;
        const dist = seededRandom(i * 222 + j, centerX) * flowerSize * 0.9;
        const fluffX = flowerX + Math.cos(angle) * dist;
        const fluffY = flowerY + Math.sin(angle) * dist;
        const fluffSize = (flowerSize / 8) * (0.8 + seededRandom(i * 333 + j, centerX) * 0.4); // Вариация размера

        if (ctx) {
          ctx.beginPath();
          ctx.arc(fluffX, fluffY, fluffSize, 0, Math.PI * 2);
          ctx.fillStyle = flowerFill;
          ctx.fill();

          if (params.UseStroke) {
            ctx.strokeStyle = params.StrokeColor;
            ctx.lineWidth = params.StrokeWidth * 0.3;
            ctx.stroke();
          }
        }

        const svgFluff = {
          type: 'circle',
          cx: fluffX, cy: fluffY, r: fluffSize,
          fill: svgFlowerFill
        };
        if (params.UseStroke) {
          svgFluff.stroke = params.StrokeColor;
          svgFluff.strokeWidth = params.StrokeWidth * 0.3;
        }
        svgElements.push(svgFluff);
      }

      // Рисуем прикорневые листья клевера (1-2 листа у основания каждого стебля)
      const leafSize = flowerSize * 0.5;
      const leafCount = 1 + Math.floor(seededRandom(i * 888, centerX) * 2); // 1-2 листа
      const leafStemLength = stemHeight * 0.2; // Короткие черешки

      for (let k = 0; k < leafCount; k++) {
        // Листья растут от основания стебля цветка
        const leafBaseX = startX + (seededRandom(i * 111 + k, centerX) - 0.5) * flowerSize * 0.3;
        const leafBaseY = startY;

        const leafAngle = -Math.PI / 2 + (seededRandom(i * 222 + k, centerY) - 0.5) * 0.8;
        const leafStemEndX = leafBaseX + Math.cos(leafAngle) * leafStemLength;
        const leafStemEndY = leafBaseY + Math.sin(leafAngle) * leafStemLength;

        // Черешок листа (длинный, от земли)
        if (ctx) {
          ctx.beginPath();
          ctx.moveTo(leafBaseX, leafBaseY);
          ctx.lineTo(leafStemEndX, leafStemEndY);
          ctx.strokeStyle = params.color;
          ctx.lineWidth = stemThickness * 0.4;
          ctx.stroke();
        }

        svgElements.push({
          type: 'line',
          x1: leafBaseX, y1: leafBaseY, x2: leafStemEndX, y2: leafStemEndY,
          stroke: params.color,
          strokeWidth: stemThickness * 0.4
        });

        // Три доли на одном черешке (характерно для клевера)
        for (let m = 0; m < 3; m++) {
          const subAngle = leafAngle + (m - 1) * 0.35;
          const subLeafX = leafStemEndX + Math.cos(subAngle) * leafSize * 0.6;
          const subLeafY = leafStemEndY + Math.sin(subAngle) * leafSize * 0.4;

          if (ctx) {
            ctx.beginPath();
            ctx.ellipse(subLeafX, subLeafY, leafSize * 0.5, leafSize * 0.7, subAngle, 0, Math.PI * 2);
            ctx.fillStyle = params.leafColor || '#228B22';
            ctx.fill();

            if (params.leafUseStroke) {
              ctx.strokeStyle = params.StrokeColor;
              ctx.lineWidth = params.StrokeWidth * 0.5;
              ctx.stroke();
            }
          }

          const svgLeaf = {
            type: 'ellipse',
            cx: subLeafX, cy: subLeafY,
            rx: leafSize * 0.5, ry: leafSize * 0.7,
            fill: params.leafColor || '#228B22',
            rotation: subAngle
          };
          if (params.leafUseStroke) {
            svgLeaf.stroke = params.StrokeColor;
            svgLeaf.strokeWidth = params.StrokeWidth * 0.5;
          }
          svgElements.push(svgLeaf);
        }
      }
    }
  };

  // Одуванчик - желтый солнечный или пушистый белый
  const drawGrassDandelion = (ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor) => {
    const flowerCount = Math.max(2, Math.min(params.blades, 15));
    const maxHeight = Math.max(80, Math.min(params.length * scale * scaleFactor, 200));
    const spreadWidth = Math.max(30, Math.min(params.spread * scale * scaleFactor, 120));
    const flowerRadius = Math.max(8, Math.min(params.flowerSize * scale * scaleFactor, 25));
    const isFluffy = params.dandelionFluffy;

    for (let i = 0; i < flowerCount; i++) {
      const heightRandom = seededRandom(i * 123, centerX + centerY);
      const posRandom = seededRandom(i * 456, centerX + centerY + 100);

      const stemHeight = maxHeight * (0.7 + heightRandom * 0.3);
      const xOffset = (posRandom - 0.5) * spreadWidth;
      const startX = centerX + xOffset;
      const startY = centerY;
      const stemThickness = Math.max(1.5, Math.min(params.thickness * 0.5 * scale * scaleFactor, 4));

      // Стебель (полый и тонкий) с учетом направления ветра
      const windAngle = (params.windDirection * Math.PI) / 180;
      const endX = startX + Math.sin(windAngle) * stemHeight * 0.15 + (seededRandom(i * 789, centerX) - 0.5) * 5;
      const endY = startY - stemHeight;

      let strokeStyle = params.color;
      let svgStroke = params.color;

      if (params.UseGradient) {
        const gradientId = `dandelionStem_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const grad = createGradient(ctx, startX, startY, endX, endY, params.GradientStartColor, params.GradientEndColor, gradientId, svgDefs);
        strokeStyle = grad.canvasStyle;
        svgStroke = grad.svgStyle;
      }

      // Рисуем стебель
      if (ctx) {
        ctx.lineCap = 'round';
        if (params.UseStroke) {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = params.StrokeColor;
          ctx.lineWidth = stemThickness + 2 * params.StrokeWidth;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = stemThickness;
        ctx.stroke();
      }

      // SVG стебель
      const svgLine = {
        type: 'line',
        x1: startX, y1: startY, x2: endX, y2: endY,
        stroke: svgStroke,
        strokeWidth: stemThickness,
        strokeLinecap: 'round'
      };
      if (params.UseStroke) {
        svgLine.strokeOutline = { color: params.StrokeColor, width: params.StrokeWidth };
      }
      svgElements.push(svgLine);

      if (isFluffy) {
        // Пушистый белый одуванчик - улучшенные "парашютики" с семечками
        const seedCount = Math.floor(25 + seededRandom(i * 777, centerX) * 20);

        for (let j = 0; j < seedCount; j++) {
          const angle = (j / seedCount) * Math.PI * 2 + seededRandom(j * 333, i) * 0.4;
          const distance = flowerRadius * (0.2 + seededRandom(j * 444, i) * 0.8);
          const seedBaseX = endX + Math.cos(angle) * distance;
          const seedBaseY = endY + Math.sin(angle) * distance;

          // Тонкая ножка парашютика (изогнутая от ветра)
          const stemLength = flowerRadius * (0.5 + seededRandom(j * 555, i) * 0.3);
          const windBias = (seededRandom(j * 666, i) - 0.5) * 0.3;
          const stemAngle = angle + windBias;
          const stemEndX = seedBaseX + Math.cos(stemAngle) * stemLength;
          const stemEndY = seedBaseY + Math.sin(stemAngle) * stemLength;

          if (ctx) {
            ctx.strokeStyle = 'rgba(200, 200, 200, 0.7)';
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(seedBaseX, seedBaseY);
            ctx.lineTo(stemEndX, stemEndY);
            ctx.stroke();

            // Семечко у основания
            ctx.fillStyle = '#8B7355';
            ctx.beginPath();
            ctx.ellipse(seedBaseX, seedBaseY, 0.8, 1.2, angle, 0, Math.PI * 2);
            ctx.fill();

            // Парашют - более пушистый с большим количеством волосков
            const umbrellaRays = 8 + Math.floor(seededRandom(j * 777, i) * 4);
            const rayBaseLength = 2.5;

            for (let k = 0; k < umbrellaRays; k++) {
              const rayAngle = (k / umbrellaRays) * Math.PI * 2 + seededRandom(j * 888 + k, i) * 0.2;
              const rayLength = rayBaseLength * (0.8 + seededRandom(j * 999 + k, i) * 0.4);
              const rayEndX = stemEndX + Math.cos(rayAngle) * rayLength;
              const rayEndY = stemEndY + Math.sin(rayAngle) * rayLength;

              ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
              ctx.lineWidth = 0.3;
              ctx.beginPath();
              ctx.moveTo(stemEndX, stemEndY);
              ctx.lineTo(rayEndX, rayEndY);
              ctx.stroke();

              // Пушистые ворсинки на концах лучей
              const fluffCount = 3;
              for (let f = 0; f < fluffCount; f++) {
                const fluffAngle = rayAngle + (f - 1) * 0.15;
                const fluffLength = 0.8;
                const fluffEndX = rayEndX + Math.cos(fluffAngle) * fluffLength;
                const fluffEndY = rayEndY + Math.sin(fluffAngle) * fluffLength;

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 0.2;
                ctx.beginPath();
                ctx.moveTo(rayEndX, rayEndY);
                ctx.lineTo(fluffEndX, fluffEndY);
                ctx.stroke();
              }
            }
          }

          // SVG стебелек парашютика
          svgElements.push({
            type: 'line',
            x1: seedBaseX, y1: seedBaseY, x2: stemEndX, y2: stemEndY,
            stroke: 'rgba(200, 200, 200, 0.7)',
            strokeWidth: 0.4
          });

          // SVG семечко
          svgElements.push({
            type: 'ellipse',
            cx: seedBaseX, cy: seedBaseY,
            rx: 0.8, ry: 1.2,
            fill: '#8B7355',
            rotation: angle
          });

          // SVG лучи парашюта
          const umbrellaRays = 8 + Math.floor(seededRandom(j * 777, i) * 4);
          const rayBaseLength = 2.5;

          for (let k = 0; k < umbrellaRays; k++) {
            const rayAngle = (k / umbrellaRays) * Math.PI * 2 + seededRandom(j * 888 + k, i) * 0.2;
            const rayLength = rayBaseLength * (0.8 + seededRandom(j * 999 + k, i) * 0.4);
            const rayEndX = stemEndX + Math.cos(rayAngle) * rayLength;
            const rayEndY = stemEndY + Math.sin(rayAngle) * rayLength;

            svgElements.push({
              type: 'line',
              x1: stemEndX, y1: stemEndY, x2: rayEndX, y2: rayEndY,
              stroke: 'rgba(255, 255, 255, 0.6)',
              strokeWidth: 0.3
            });

            // SVG пушистые ворсинки
            const fluffCount = 3;
            for (let f = 0; f < fluffCount; f++) {
              const fluffAngle = rayAngle + (f - 1) * 0.15;
              const fluffLength = 0.8;
              const fluffEndX = rayEndX + Math.cos(fluffAngle) * fluffLength;
              const fluffEndY = rayEndY + Math.sin(fluffAngle) * fluffLength;

              svgElements.push({
                type: 'line',
                x1: rayEndX, y1: rayEndY, x2: fluffEndX, y2: fluffEndY,
                stroke: 'rgba(255, 255, 255, 0.4)',
                strokeWidth: 0.2
              });
            }
          }
        }
      } else {
        // Желтый солнечный одуванчик - множество тонких лепестков
        const petalCount = Math.max(40, Math.min(params.petalCount * 5, 80));

        let flowerFill = params.flowerColor || '#FFD700';
        let svgFlowerFill = flowerFill;

        // Рисуем лепестки
        for (let j = 0; j < petalCount; j++) {
          const angle = (j / petalCount) * Math.PI * 2 + seededRandom(j * 555, i) * 0.1;
          const petalLength = flowerRadius * (0.8 + seededRandom(j * 666, i) * 0.4);
          const petalWidth = flowerRadius * 0.15;

          const petalX = endX + Math.cos(angle) * petalLength * 0.5;
          const petalY = endY + Math.sin(angle) * petalLength * 0.5;
          const petalEndX = endX + Math.cos(angle) * petalLength;
          const petalEndY = endY + Math.sin(angle) * petalLength;

          if (ctx) {
            ctx.save();
            ctx.translate(endX, endY);
            ctx.rotate(angle);
            ctx.fillStyle = flowerFill;
            ctx.beginPath();
            ctx.ellipse(petalLength * 0.5, 0, petalLength * 0.5, petalWidth, 0, 0, Math.PI * 2);
            ctx.fill();

            if (params.UseStroke) {
              ctx.strokeStyle = params.StrokeColor;
              ctx.lineWidth = params.StrokeWidth * 0.5;
              ctx.stroke();
            }
            ctx.restore();
          }

          // SVG лепесток
          const svgPetal = {
            type: 'ellipse',
            cx: endX + Math.cos(angle) * petalLength * 0.5,
            cy: endY + Math.sin(angle) * petalLength * 0.5,
            rx: petalLength * 0.5,
            ry: petalWidth,
            fill: svgFlowerFill,
            rotation: angle
          };
          if (params.UseStroke) {
            svgPetal.stroke = params.StrokeColor;
            svgPetal.strokeWidth = params.StrokeWidth * 0.5;
          }
          svgElements.push(svgPetal);
        }

        // Центр цветка
        const centerRadius = flowerRadius * 0.3;
        let centerFill = params.flowerCenterColor || '#FFA500';

        if (ctx) {
          ctx.fillStyle = centerFill;
          ctx.beginPath();
          ctx.arc(endX, endY, centerRadius, 0, Math.PI * 2);
          ctx.fill();

          if (params.UseStroke) {
            ctx.strokeStyle = params.StrokeColor;
            ctx.lineWidth = params.StrokeWidth;
            ctx.stroke();
          }
        }

        // SVG центр
        const svgCenter = {
          type: 'circle',
          cx: endX, cy: endY,
          r: centerRadius,
          fill: centerFill
        };
        if (params.UseStroke) {
          svgCenter.stroke = params.StrokeColor;
          svgCenter.strokeWidth = params.StrokeWidth;
        }
        svgElements.push(svgCenter);
      }

      // Прикорневая розетка листьев одуванчика (2-3 листа у земли)
      const leafCount = 2 + Math.floor(seededRandom(i * 777, centerX) * 2);
      for (let k = 0; k < leafCount; k++) {
        // Листья растут почти горизонтально от основания (прижаты к земле)
        const leafAngle = (seededRandom(i * 111 + k, centerX) - 0.5) * Math.PI * 0.8 + Math.PI / 2;
        const leafLength = flowerRadius * (1.2 + seededRandom(i * 222 + k, centerY) * 0.5);
        const leafWidth = flowerRadius * 0.4;

        const leafBaseX = startX;
        const leafBaseY = startY;
        const leafTipX = leafBaseX + Math.cos(leafAngle) * leafLength;
        const leafTipY = leafBaseY + Math.sin(leafAngle) * leafLength * 0.3; // Почти горизонтально

        // Зубчатый контур листа (характерно для одуванчика)
        const serrations = 5;
        const leafPath = [];

        for (let j = 0; j <= serrations; j++) {
          const t = j / serrations;
          const x = leafBaseX + (leafTipX - leafBaseX) * t;
          const y = leafBaseY + (leafTipY - leafBaseY) * t;
          const perpAngle = leafAngle + Math.PI / 2;
          const offset = Math.sin(t * Math.PI) * leafWidth * (j % 2 === 0 ? 1 : 0.5);

          leafPath.push({
            x: x + Math.cos(perpAngle) * offset,
            y: y + Math.sin(perpAngle) * offset
          });
        }

        if (ctx) {
          ctx.fillStyle = params.leafColor || '#2D5016';
          ctx.beginPath();
          ctx.moveTo(leafPath[0].x, leafPath[0].y);
          for (let j = 1; j < leafPath.length; j++) {
            ctx.lineTo(leafPath[j].x, leafPath[j].y);
          }
          ctx.closePath();
          ctx.fill();

          if (params.leafUseStroke) {
            ctx.strokeStyle = params.StrokeColor;
            ctx.lineWidth = params.StrokeWidth;
            ctx.stroke();
          }
        }

        // SVG лист
        let pathD = `M ${leafPath[0].x} ${leafPath[0].y}`;
        for (let j = 1; j < leafPath.length; j++) {
          pathD += ` L ${leafPath[j].x} ${leafPath[j].y}`;
        }
        pathD += ' Z';

        const svgLeaf = {
          type: 'path',
          d: pathD,
          fill: params.leafColor || '#2D5016'
        };
        if (params.leafUseStroke) {
          svgLeaf.stroke = params.StrokeColor;
          svgLeaf.strokeWidth = params.StrokeWidth;
        }
        svgElements.push(svgLeaf);
      }
    }
  };

  // Ромашка - белые лепестки с желтым центром
  const drawGrassChamomile = (ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor) => {
    const flowerCount = Math.max(2, Math.min(params.blades, 15));
    const maxHeight = Math.max(70, Math.min(params.length * scale * scaleFactor, 180));
    const spreadWidth = Math.max(30, Math.min(params.spread * scale * scaleFactor, 120));
    const flowerRadius = Math.max(10, Math.min(params.flowerSize * scale * scaleFactor, 20));
    const windAngle = (params.windDirection * Math.PI) / 180;

    for (let i = 0; i < flowerCount; i++) {
      const heightRandom = seededRandom(i * 123, centerX + centerY);
      const posRandom = seededRandom(i * 456, centerX + centerY + 100);

      const stemHeight = maxHeight * (0.7 + heightRandom * 0.3);
      const xOffset = (posRandom - 0.5) * spreadWidth;
      const startX = centerX + xOffset;
      const startY = centerY;
      const stemThickness = Math.max(1, Math.min(params.thickness * 0.4 * scale * scaleFactor, 3));

      // Тонкий зеленый стебель с наклоном от ветра
      const endX = startX + Math.sin(windAngle) * stemHeight * 0.15 + (seededRandom(i * 789, centerX) - 0.5) * 5;
      const endY = startY - stemHeight;

      let strokeStyle = params.color;
      let svgStroke = params.color;

      if (params.UseGradient) {
        const gradientId = `chamomileStem_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const grad = createGradient(ctx, startX, startY, endX, endY, params.GradientStartColor, params.GradientEndColor, gradientId, svgDefs);
        strokeStyle = grad.canvasStyle;
        svgStroke = grad.svgStyle;
      }

      // Рисуем стебель
      if (ctx) {
        ctx.lineCap = 'round';
        if (params.UseStroke) {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = params.StrokeColor;
          ctx.lineWidth = stemThickness + 2 * params.StrokeWidth;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = stemThickness;
        ctx.stroke();
      }

      // SVG стебель
      const svgLine = {
        type: 'line',
        x1: startX, y1: startY, x2: endX, y2: endY,
        stroke: svgStroke,
        strokeWidth: stemThickness,
        strokeLinecap: 'round'
      };
      if (params.UseStroke) {
        svgLine.strokeOutline = { color: params.StrokeColor, width: params.StrokeWidth };
      }
      svgElements.push(svgLine);

      // Белые лепестки
      const petalCount = Math.max(8, Math.min(params.petalCount, 16));
      let petalColor = params.flowerColor || '#FFFFFF';

      for (let j = 0; j < petalCount; j++) {
        const angle = (j / petalCount) * Math.PI * 2;
        const petalLength = flowerRadius * (1.0 + seededRandom(j * 888, i) * 0.2);
        const petalWidth = flowerRadius * 0.25;

        // Лепесток - вытянутый эллипс
        const petalCenterX = endX + Math.cos(angle) * petalLength * 0.6;
        const petalCenterY = endY + Math.sin(angle) * petalLength * 0.6;

        if (ctx) {
          ctx.save();
          ctx.translate(petalCenterX, petalCenterY);
          ctx.rotate(angle);
          ctx.fillStyle = petalColor;
          ctx.beginPath();
          ctx.ellipse(0, 0, petalLength * 0.5, petalWidth, 0, 0, Math.PI * 2);
          ctx.fill();

          if (params.UseStroke) {
            ctx.strokeStyle = params.StrokeColor;
            ctx.lineWidth = params.StrokeWidth * 0.5;
            ctx.stroke();
          }
          ctx.restore();
        }

        // SVG лепесток
        const svgPetal = {
          type: 'ellipse',
          cx: petalCenterX, cy: petalCenterY,
          rx: petalLength * 0.5, ry: petalWidth,
          fill: petalColor,
          rotation: angle
        };
        if (params.UseStroke) {
          svgPetal.stroke = params.StrokeColor;
          svgPetal.strokeWidth = params.StrokeWidth * 0.5;
        }
        svgElements.push(svgPetal);
      }

      // Желтый центр
      const centerRadius = flowerRadius * 0.35;
      let centerColor = params.flowerCenterColor || '#FFD700';

      if (ctx) {
        ctx.fillStyle = centerColor;
        ctx.beginPath();
        ctx.arc(endX, endY, centerRadius, 0, Math.PI * 2);
        ctx.fill();

        // Текстура центра (маленькие точки)
        const dotCount = 12;
        for (let d = 0; d < dotCount; d++) {
          const dotAngle = (d / dotCount) * Math.PI * 2;
          const dotDist = centerRadius * 0.4;
          const dotX = endX + Math.cos(dotAngle) * dotDist;
          const dotY = endY + Math.sin(dotAngle) * dotDist;

          ctx.fillStyle = '#CC9900';
          ctx.beginPath();
          ctx.arc(dotX, dotY, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }

        if (params.UseStroke) {
          ctx.strokeStyle = params.StrokeColor;
          ctx.lineWidth = params.StrokeWidth;
          ctx.beginPath();
          ctx.arc(endX, endY, centerRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // SVG центр
      const svgCenter = {
        type: 'circle',
        cx: endX, cy: endY,
        r: centerRadius,
        fill: centerColor
      };
      if (params.UseStroke) {
        svgCenter.stroke = params.StrokeColor;
        svgCenter.strokeWidth = params.StrokeWidth;
      }
      svgElements.push(svgCenter);

      // SVG текстура точек
      const dotCount = 12;
      for (let d = 0; d < dotCount; d++) {
        const dotAngle = (d / dotCount) * Math.PI * 2;
        const dotDist = centerRadius * 0.4;
        const dotX = endX + Math.cos(dotAngle) * dotDist;
        const dotY = endY + Math.sin(dotAngle) * dotDist;

        svgElements.push({
          type: 'circle',
          cx: dotX, cy: dotY,
          r: 0.8,
          fill: '#CC9900'
        });
      }

      // Перистые листья на стебле (2-3 пары)
      const leafPairs = 2 + Math.floor(seededRandom(i * 888, centerX) * 2);
      for (let j = 0; j < leafPairs; j++) {
        const leafT = (j + 1) / (leafPairs + 1);
        const leafX = startX + (endX - startX) * leafT;
        const leafY = startY + (endY - startY) * leafT;
        const leafSize = flowerRadius * (0.8 - leafT * 0.3);
        const side = (j % 2 === 0) ? -1 : 1;

        // Перистый лист с 3-4 сегментами
        const segments = 3;
        for (let s = 0; s < segments; s++) {
          const segT = s / (segments - 1);
          const segX = leafX + side * leafSize * 0.15;
          const segY = leafY + (segT - 0.5) * leafSize * 0.8;
          const segEndX = segX + side * leafSize * 0.4;
          const segEndY = segY;

          if (ctx) {
            ctx.strokeStyle = params.leafColor || '#2D5016';
            ctx.lineWidth = stemThickness * 0.3;
            ctx.beginPath();
            ctx.moveTo(segX, segY);
            ctx.lineTo(segEndX, segEndY);
            ctx.stroke();

            if (params.leafUseStroke) {
              ctx.strokeStyle = params.StrokeColor;
              ctx.lineWidth = params.StrokeWidth * 0.5;
              ctx.stroke();
            }
          }

          svgElements.push({
            type: 'line',
            x1: segX, y1: segY, x2: segEndX, y2: segEndY,
            stroke: params.leafColor || '#2D5016',
            strokeWidth: stemThickness * 0.3
          });
        }

        // Центральная жилка листа
        const mainVeinStartY = leafY - leafSize * 0.4;
        const mainVeinEndY = leafY + leafSize * 0.4;

        if (ctx) {
          ctx.strokeStyle = params.leafColor || '#2D5016';
          ctx.lineWidth = stemThickness * 0.4;
          ctx.beginPath();
          ctx.moveTo(leafX + side * leafSize * 0.15, mainVeinStartY);
          ctx.lineTo(leafX + side * leafSize * 0.15, mainVeinEndY);
          ctx.stroke();
        }

        svgElements.push({
          type: 'line',
          x1: leafX + side * leafSize * 0.15, y1: mainVeinStartY,
          x2: leafX + side * leafSize * 0.15, y2: mainVeinEndY,
          stroke: params.leafColor || '#2D5016',
          strokeWidth: stemThickness * 0.4
        });
      }
    }
  };

  // Василек - синие рваные лепестки
  const drawGrassCornflower = (ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor) => {
    const flowerCount = Math.max(2, Math.min(params.blades, 15));
    const maxHeight = Math.max(80, Math.min(params.length * scale * scaleFactor, 200));
    const spreadWidth = Math.max(30, Math.min(params.spread * scale * scaleFactor, 120));
    const flowerRadius = Math.max(8, Math.min(params.flowerSize * scale * scaleFactor, 18));
    const windAngle = (params.windDirection * Math.PI) / 180;

    for (let i = 0; i < flowerCount; i++) {
      const heightRandom = seededRandom(i * 123, centerX + centerY);
      const posRandom = seededRandom(i * 456, centerX + centerY + 100);

      const stemHeight = maxHeight * (0.75 + heightRandom * 0.25);
      const xOffset = (posRandom - 0.5) * spreadWidth;
      const startX = centerX + xOffset;
      const startY = centerY;
      const stemThickness = Math.max(1, Math.min(params.thickness * 0.35 * scale * scaleFactor, 2.5));

      // Тонкий стебель с наклоном от ветра
      const endX = startX + Math.sin(windAngle) * stemHeight * 0.12;
      const endY = startY - stemHeight;

      let strokeStyle = params.color;
      let svgStroke = params.color;

      if (params.UseGradient) {
        const gradientId = `cornflowerStem_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const grad = createGradient(ctx, startX, startY, endX, endY, params.GradientStartColor, params.GradientEndColor, gradientId, svgDefs);
        strokeStyle = grad.canvasStyle;
        svgStroke = grad.svgStyle;
      }

      // Рисуем стебель
      if (ctx) {
        ctx.lineCap = 'round';
        if (params.UseStroke) {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = params.StrokeColor;
          ctx.lineWidth = stemThickness + 2 * params.StrokeWidth;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = stemThickness;
        ctx.stroke();
      }

      // SVG стебель
      const svgLine = {
        type: 'line',
        x1: startX, y1: startY, x2: endX, y2: endY,
        stroke: svgStroke,
        strokeWidth: stemThickness,
        strokeLinecap: 'round'
      };
      if (params.UseStroke) {
        svgLine.strokeOutline = { color: params.StrokeColor, width: params.StrokeWidth };
      }
      svgElements.push(svgLine);

      // Рваные синие лепестки (внешний слой)
      const outerPetalCount = Math.max(6, Math.min(params.petalCount, 12));
      let petalColor = params.flowerColor || '#4169E1'; // Royal blue

      for (let j = 0; j < outerPetalCount; j++) {
        const angle = (j / outerPetalCount) * Math.PI * 2 + seededRandom(j * 999, i) * 0.2;
        const petalLength = flowerRadius * (1.2 + seededRandom(j * 777, i) * 0.3);

        // Рваный край лепестка (несколько зубцов)
        const jagCount = 4;
        const petalPath = [];

        petalPath.push({ x: endX, y: endY }); // Центр

        for (let k = 0; k <= jagCount; k++) {
          const t = k / jagCount;
          const subAngle = angle - 0.15 + t * 0.3;
          const dist = petalLength * (0.7 + Math.sin(t * Math.PI) * 0.3) * (k % 2 === 0 ? 1 : 0.85);

          petalPath.push({
            x: endX + Math.cos(subAngle) * dist,
            y: endY + Math.sin(subAngle) * dist
          });
        }

        if (ctx) {
          ctx.fillStyle = petalColor;
          ctx.beginPath();
          ctx.moveTo(petalPath[0].x, petalPath[0].y);
          for (let p = 1; p < petalPath.length; p++) {
            ctx.lineTo(petalPath[p].x, petalPath[p].y);
          }
          ctx.closePath();
          ctx.fill();

          if (params.UseStroke) {
            ctx.strokeStyle = params.StrokeColor;
            ctx.lineWidth = params.StrokeWidth * 0.5;
            ctx.stroke();
          }
        }

        // SVG лепесток
        let pathD = `M ${petalPath[0].x} ${petalPath[0].y}`;
        for (let p = 1; p < petalPath.length; p++) {
          pathD += ` L ${petalPath[p].x} ${petalPath[p].y}`;
        }
        pathD += ' Z';

        const svgPetal = {
          type: 'path',
          d: pathD,
          fill: petalColor
        };
        if (params.UseStroke) {
          svgPetal.stroke = params.StrokeColor;
          svgPetal.strokeWidth = params.StrokeWidth * 0.5;
        }
        svgElements.push(svgPetal);
      }

      // Внутренние маленькие лепестки (темнее)
      const innerPetalCount = Math.floor(outerPetalCount * 0.6);
      const innerColor = params.flowerCenterColor || '#1E3A8A'; // Darker blue

      for (let j = 0; j < innerPetalCount; j++) {
        const angle = (j / innerPetalCount) * Math.PI * 2 + Math.PI / innerPetalCount;
        const petalLength = flowerRadius * 0.5;
        const petalWidth = flowerRadius * 0.2;

        if (ctx) {
          ctx.save();
          ctx.translate(endX, endY);
          ctx.rotate(angle);
          ctx.fillStyle = innerColor;
          ctx.beginPath();
          ctx.ellipse(petalLength * 0.5, 0, petalLength * 0.5, petalWidth, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        svgElements.push({
          type: 'ellipse',
          cx: endX + Math.cos(angle) * petalLength * 0.5,
          cy: endY + Math.sin(angle) * petalLength * 0.5,
          rx: petalLength * 0.5,
          ry: petalWidth,
          fill: innerColor,
          rotation: angle
        });
      }

      // Центр цветка (темный)
      const centerRadius = flowerRadius * 0.25;

      if (ctx) {
        ctx.fillStyle = '#2C1810';
        ctx.beginPath();
        ctx.arc(endX, endY, centerRadius, 0, Math.PI * 2);
        ctx.fill();

        if (params.UseStroke) {
          ctx.strokeStyle = params.StrokeColor;
          ctx.lineWidth = params.StrokeWidth;
          ctx.stroke();
        }
      }

      svgElements.push({
        type: 'circle',
        cx: endX, cy: endY,
        r: centerRadius,
        fill: '#2C1810'
      });

      // Узкие ланцетные листья на стебле (2-3 пары)
      const leafPairs = 2 + Math.floor(seededRandom(i * 888, centerX) * 2);
      for (let j = 0; j < leafPairs; j++) {
        const leafT = (j + 1) / (leafPairs + 1); // Позиция на стебле (0.25 - 0.75)
        const leafX = startX + (endX - startX) * leafT;
        const leafY = startY + (endY - startY) * leafT;

        const leafLength = flowerRadius * (1.5 - leafT * 0.5); // Листья меньше к верху
        const leafWidth = flowerRadius * 0.2;
        const side = (j % 2 === 0) ? -1 : 1;
        const leafAngle = side * (Math.PI / 2 - 0.3);

        // Узкий ланцетный лист, направленный в сторону и вверх
        const leafPath = [
          { x: leafX, y: leafY },
          { x: leafX + Math.cos(leafAngle) * leafWidth * 0.5, y: leafY - Math.sin(leafAngle) * leafWidth * 0.5 },
          { x: leafX + Math.cos(leafAngle) * leafLength * 0.7, y: leafY - Math.sin(leafAngle) * leafLength * 0.7 - leafWidth },
          { x: leafX + Math.cos(leafAngle) * leafLength, y: leafY - Math.sin(leafAngle) * leafLength },
          { x: leafX + Math.cos(leafAngle) * leafLength * 0.7, y: leafY - Math.sin(leafAngle) * leafLength * 0.7 + leafWidth * 0.5 },
          { x: leafX + Math.cos(leafAngle) * leafWidth * 0.3, y: leafY - Math.sin(leafAngle) * leafWidth * 0.3 }
        ];

        if (ctx) {
          ctx.fillStyle = params.leafColor || '#2D5016';
          ctx.beginPath();
          ctx.moveTo(leafPath[0].x, leafPath[0].y);
          for (let p = 1; p < leafPath.length; p++) {
            ctx.lineTo(leafPath[p].x, leafPath[p].y);
          }
          ctx.closePath();
          ctx.fill();

          if (params.leafUseStroke) {
            ctx.strokeStyle = params.StrokeColor;
            ctx.lineWidth = params.StrokeWidth;
            ctx.stroke();
          }
        }

        let pathD = `M ${leafPath[0].x} ${leafPath[0].y}`;
        for (let p = 1; p < leafPath.length; p++) {
          pathD += ` L ${leafPath[p].x} ${leafPath[p].y}`;
        }
        pathD += ' Z';

        const svgLeaf = {
          type: 'path',
          d: pathD,
          fill: params.leafColor || '#2D5016'
        };
        if (params.leafUseStroke) {
          svgLeaf.stroke = params.StrokeColor;
          svgLeaf.strokeWidth = params.StrokeWidth;
        }
        svgElements.push(svgLeaf);
      }
    }
  };

  // Колокольчик - висячие колокольчатые цветы
  const drawGrassBellflower = (ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor) => {
    const stemCount = Math.max(2, Math.min(params.blades, 15));
    const maxHeight = Math.max(90, Math.min(params.length * scale * scaleFactor, 200));
    const spreadWidth = Math.max(30, Math.min(params.spread * scale * scaleFactor, 120));
    const bellSize = Math.max(8, Math.min(params.flowerSize * scale * scaleFactor, 16));
    const bellsPerStem = Math.max(2, Math.min(params.bellCount, 5));
    const windAngle = (params.windDirection * Math.PI) / 180;

    for (let i = 0; i < stemCount; i++) {
      const heightRandom = seededRandom(i * 123, centerX + centerY);
      const posRandom = seededRandom(i * 456, centerX + centerY + 100);

      const stemHeight = maxHeight * (0.8 + heightRandom * 0.2);
      const xOffset = (posRandom - 0.5) * spreadWidth;
      const startX = centerX + xOffset;
      const startY = centerY;
      const stemThickness = Math.max(1.5, Math.min(params.thickness * 0.4 * scale * scaleFactor, 3));

      // Изогнутый основной стебель с наклоном от ветра
      const mainStemEndX = startX + Math.sin(windAngle) * stemHeight * 0.18 + (seededRandom(i * 789, centerX) - 0.5) * 8;
      const mainStemEndY = startY - stemHeight;

      const cp1X = startX + (mainStemEndX - startX) * 0.3;
      const cp1Y = startY - stemHeight * 0.3;
      const cp2X = startX + (mainStemEndX - startX) * 0.7;
      const cp2Y = startY - stemHeight * 0.7;

      let strokeStyle = params.color;
      let svgStroke = params.color;

      if (params.UseGradient) {
        const gradientId = `bellflowerStem_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const grad = createGradient(ctx, startX, startY, mainStemEndX, mainStemEndY, params.GradientStartColor, params.GradientEndColor, gradientId, svgDefs);
        strokeStyle = grad.canvasStyle;
        svgStroke = grad.svgStyle;
      }

      // Рисуем основной стебель
      if (ctx) {
        ctx.lineCap = 'round';
        if (params.UseStroke) {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, mainStemEndX, mainStemEndY);
          ctx.strokeStyle = params.StrokeColor;
          ctx.lineWidth = stemThickness + 2 * params.StrokeWidth;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, mainStemEndX, mainStemEndY);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = stemThickness;
        ctx.stroke();
      }

      // SVG основной стебель
      const svgPath = {
        type: 'path',
        d: `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${mainStemEndX} ${mainStemEndY}`,
        stroke: svgStroke,
        strokeWidth: stemThickness,
        fill: 'none',
        strokeLinecap: 'round'
      };
      if (params.UseStroke) {
        svgPath.strokeOutline = { color: params.StrokeColor, width: params.StrokeWidth };
      }
      svgElements.push(svgPath);

      // Рисуем колокольчики вдоль стебля
      let bellColor = params.flowerColor || '#6B7FD7'; // Light purple-blue

      for (let j = 0; j < bellsPerStem; j++) {
        const t = (j + 1) / (bellsPerStem + 1);

        // Вычисляем точку на кривой Безье
        const bellAttachX = Math.pow(1 - t, 3) * startX +
                           3 * Math.pow(1 - t, 2) * t * cp1X +
                           3 * (1 - t) * Math.pow(t, 2) * cp2X +
                           Math.pow(t, 3) * mainStemEndX;
        const bellAttachY = Math.pow(1 - t, 3) * startY +
                           3 * Math.pow(1 - t, 2) * t * cp1Y +
                           3 * (1 - t) * Math.pow(t, 2) * cp2Y +
                           Math.pow(t, 3) * mainStemEndY;

        // Маленький стебелек к колокольчику
        const bellStemLength = bellSize * 0.8;
        const bellStemAngle = Math.PI / 2 + (seededRandom(i * 333 + j, centerX) - 0.5) * 0.4;
        const bellTopX = bellAttachX + Math.cos(bellStemAngle) * bellStemLength;
        const bellTopY = bellAttachY + Math.sin(bellStemAngle) * bellStemLength;

        if (ctx) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = stemThickness * 0.5;
          ctx.beginPath();
          ctx.moveTo(bellAttachX, bellAttachY);
          ctx.lineTo(bellTopX, bellTopY);
          ctx.stroke();
        }

        svgElements.push({
          type: 'line',
          x1: bellAttachX, y1: bellAttachY, x2: bellTopX, y2: bellTopY,
          stroke: svgStroke,
          strokeWidth: stemThickness * 0.5
        });

        // Колокольчик (форма колокола)
        const bellWidth = bellSize * 1.2;
        const bellHeight = bellSize * 1.4;

        // Создаем форму колокола с помощью кривых
        const bellPath = [];

        // Верх колокола (округлый)
        const topRadius = bellWidth * 0.25;
        bellPath.push({ x: bellTopX, y: bellTopY });

        // Боковые стороны расширяются вниз
        const leftTopY = bellTopY + topRadius;
        const leftBottomX = bellTopX - bellWidth * 0.5;
        const leftBottomY = bellTopY + bellHeight;
        const rightBottomX = bellTopX + bellWidth * 0.5;

        if (ctx) {
          ctx.fillStyle = bellColor;
          ctx.beginPath();
          ctx.moveTo(bellTopX - topRadius, bellTopY);
          ctx.quadraticCurveTo(bellTopX - topRadius, bellTopY - topRadius * 0.5, bellTopX, bellTopY - topRadius * 0.5);
          ctx.quadraticCurveTo(bellTopX + topRadius, bellTopY - topRadius * 0.5, bellTopX + topRadius, bellTopY);
          ctx.quadraticCurveTo(rightBottomX, leftTopY, rightBottomX, leftBottomY);
          ctx.lineTo(leftBottomX, leftBottomY);
          ctx.quadraticCurveTo(leftBottomX, leftTopY, bellTopX - topRadius, bellTopY);
          ctx.closePath();
          ctx.fill();

          if (params.UseStroke) {
            ctx.strokeStyle = params.StrokeColor;
            ctx.lineWidth = params.StrokeWidth;
            ctx.stroke();
          }

          // Зубчатый край снизу (5 зубцов)
          const petalCount = 5;
          for (let p = 0; p < petalCount; p++) {
            const petalAngle = Math.PI + (p / petalCount - 0.5) * Math.PI;
            const petalX = bellTopX + Math.cos(petalAngle) * bellWidth * 0.45;
            const petalY = leftBottomY;
            const petalTipX = petalX + Math.cos(Math.PI / 2) * bellHeight * 0.15;
            const petalTipY = petalY + bellHeight * 0.15;

            ctx.beginPath();
            ctx.moveTo(bellTopX, leftBottomY);
            ctx.lineTo(petalX, petalY);
            ctx.lineTo(petalTipX, petalTipY);
            ctx.fillStyle = bellColor;
            ctx.fill();
          }
        }

        // SVG колокольчик
        const svgBellPath = `M ${bellTopX - topRadius} ${bellTopY}
                            Q ${bellTopX - topRadius} ${bellTopY - topRadius * 0.5} ${bellTopX} ${bellTopY - topRadius * 0.5}
                            Q ${bellTopX + topRadius} ${bellTopY - topRadius * 0.5} ${bellTopX + topRadius} ${bellTopY}
                            Q ${rightBottomX} ${leftTopY} ${rightBottomX} ${leftBottomY}
                            L ${leftBottomX} ${leftBottomY}
                            Q ${leftBottomX} ${leftTopY} ${bellTopX - topRadius} ${bellTopY} Z`;

        const svgBell = {
          type: 'path',
          d: svgBellPath,
          fill: bellColor
        };
        if (params.UseStroke) {
          svgBell.stroke = params.StrokeColor;
          svgBell.strokeWidth = params.StrokeWidth;
        }
        svgElements.push(svgBell);

        // SVG зубчатый край
        const petalCount = 5;
        for (let p = 0; p < petalCount; p++) {
          const petalAngle = Math.PI + (p / petalCount - 0.5) * Math.PI;
          const petalX = bellTopX + Math.cos(petalAngle) * bellWidth * 0.45;
          const petalY = leftBottomY;
          const petalTipX = petalX + Math.cos(Math.PI / 2) * bellHeight * 0.15;
          const petalTipY = petalY + bellHeight * 0.15;

          svgElements.push({
            type: 'path',
            d: `M ${bellTopX} ${leftBottomY} L ${petalX} ${petalY} L ${petalTipX} ${petalTipY} Z`,
            fill: bellColor
          });
        }

        // Тычинки внутри (маленькие линии)
        const stamenCount = 3;
        for (let s = 0; s < stamenCount; s++) {
          const stamenAngle = Math.PI / 2 + (s / stamenCount - 0.5) * 0.6;
          const stamenLength = bellHeight * 0.6;
          const stamenX = bellTopX + Math.cos(stamenAngle) * stamenLength * 0.3;
          const stamenY = bellTopY + bellHeight * 0.3;
          const stamenEndX = stamenX;
          const stamenEndY = stamenY + stamenLength;

          if (ctx) {
            ctx.strokeStyle = params.flowerCenterColor || '#FFD700';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(stamenX, stamenY);
            ctx.lineTo(stamenEndX, stamenEndY);
            ctx.stroke();

            // Кончик тычинки
            ctx.fillStyle = params.flowerCenterColor || '#FFD700';
            ctx.beginPath();
            ctx.arc(stamenEndX, stamenEndY, 1, 0, Math.PI * 2);
            ctx.fill();
          }

          svgElements.push({
            type: 'line',
            x1: stamenX, y1: stamenY, x2: stamenEndX, y2: stamenEndY,
            stroke: params.flowerCenterColor || '#FFD700',
            strokeWidth: 0.8
          });

          svgElements.push({
            type: 'circle',
            cx: stamenEndX, cy: stamenEndY,
            r: 1,
            fill: params.flowerCenterColor || '#FFD700'
          });
        }
      }

      // Листья на стебле колокольчика (2-3 пары)
      const leafPairs = 2 + Math.floor(seededRandom(i * 999, centerX) * 2);
      for (let k = 0; k < leafPairs; k++) {
        const leafT = (k + 1) / (leafPairs + 2); // Позиция на стебле

        // Интерполяция по кривой Безье для нахождения позиции листа
        const leafX = Math.pow(1 - leafT, 3) * startX + 3 * Math.pow(1 - leafT, 2) * leafT * cp1X + 3 * (1 - leafT) * Math.pow(leafT, 2) * cp2X + Math.pow(leafT, 3) * mainStemEndX;
        const leafY = Math.pow(1 - leafT, 3) * startY + 3 * Math.pow(1 - leafT, 2) * leafT * cp1Y + 3 * (1 - leafT) * Math.pow(leafT, 2) * cp2Y + Math.pow(leafT, 3) * mainStemEndY;

        const leafLength = bellSize * (1.2 - leafT * 0.4); // Листья меньше к верху
        const leafWidth = bellSize * (0.8 - leafT * 0.3);
        const side = (k % 2 === 0) ? -1 : 1;

        // Овальные листья с зубчатым краем
        const segments = 6;
        const leafPath = [];

        // Создаем овальный лист с одной стороны
        for (let j = 0; j <= segments; j++) {
          const t = j / segments;
          const angle = Math.PI * t;
          const x = leafX + side * Math.cos(angle) * leafWidth;
          const y = leafY - Math.sin(angle) * leafLength;
          const zigzag = (j % 2 === 0) ? 1 : 0.9; // Маленькие зубчики

          leafPath.push({
            x: x * zigzag + leafX * (1 - zigzag),
            y: y * zigzag + leafY * (1 - zigzag)
          });
        }

        if (ctx) {
          ctx.fillStyle = params.leafColor || '#2D5016';
          ctx.beginPath();
          ctx.moveTo(leafPath[0].x, leafPath[0].y);
          for (let j = 1; j < leafPath.length; j++) {
            ctx.lineTo(leafPath[j].x, leafPath[j].y);
          }
          ctx.closePath();
          ctx.fill();

          if (params.leafUseStroke) {
            ctx.strokeStyle = params.StrokeColor;
            ctx.lineWidth = params.StrokeWidth;
            ctx.stroke();
          }
        }

        // SVG лист
        let pathD = `M ${leafPath[0].x} ${leafPath[0].y}`;
        for (let j = 1; j < leafPath.length; j++) {
          pathD += ` L ${leafPath[j].x} ${leafPath[j].y}`;
        }
        pathD += ' Z';

        const svgLeaf = {
          type: 'path',
          d: pathD,
          fill: params.leafColor || '#2D5016'
        };
        if (params.leafUseStroke) {
          svgLeaf.stroke = params.StrokeColor;
          svgLeaf.strokeWidth = params.StrokeWidth;
        }
        svgElements.push(svgLeaf);
      }
    }
  };

  // Обычная трава - улучшенные изогнутые травинки с конусообразностью
  const drawGrassRegular = (ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor) => {
    const blades = Math.max(5, Math.min(params.blades, 30));
    const maxHeight = Math.max(60, Math.min(params.length * scale * scaleFactor, 250));
    const spreadWidth = Math.max(20, Math.min(params.spread * scale * scaleFactor, 150));
    const curvature = Math.max(0.3, Math.min(params.curvature, 1.5));
    const windAngle = (params.windDirection * Math.PI) / 180;

    for (let i = 0; i < blades; i++) {
      const heightRandom = seededRandom(i * 123, centerX + centerY);
      const posRandom = seededRandom(i * 456, centerX + centerY + 100);
      const curveRandom = seededRandom(i * 789, centerX + centerY + 200);
      const thicknessRandom = seededRandom(i * 321, centerX + centerY + 300);

      const bladeHeight = maxHeight * (0.7 + heightRandom * 0.3);
      const xOffset = (posRandom - 0.5) * spreadWidth;
      const startX = centerX + xOffset;
      const startY = centerY;
      const baseThickness = Math.max(1, Math.min(params.thickness * 0.5 * scale * scaleFactor, 4)) * (0.8 + thicknessRandom * 0.2);
      const tipThickness = baseThickness * 0.2; // Заостренный кончик

      // Изогнутая травинка с квадратичной кривой
      const ctrlX = startX + (curveRandom - 0.5) * bladeHeight * curvature + Math.sin(windAngle) * bladeHeight * 0.3;
      const ctrlY = startY - bladeHeight * 0.6;
      const endX = startX + Math.sin(windAngle) * bladeHeight * 0.4;
      const endY = startY - bladeHeight;

      let strokeStyle = params.color;
      let svgStroke = params.color;

      if (params.UseGradient) {
        const gradientId = `regularGrad_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const grad = createGradient(ctx, startX, startY, endX, endY, params.GradientStartColor, params.GradientEndColor, gradientId, svgDefs);
        strokeStyle = grad.canvasStyle;
        svgStroke = grad.svgStyle;
      }

      // Рисуем травинку с переменной толщиной (конусообразная)
      if (ctx) {
        ctx.lineCap = 'round';

        // Рисуем как последовательность сегментов с убывающей толщиной
        const segments = 15;
        for (let s = 0; s < segments; s++) {
          const t1 = s / segments;
          const t2 = (s + 1) / segments;

          // Точки на кривой Безье
          const x1 = Math.pow(1 - t1, 2) * startX + 2 * (1 - t1) * t1 * ctrlX + Math.pow(t1, 2) * endX;
          const y1 = Math.pow(1 - t1, 2) * startY + 2 * (1 - t1) * t1 * ctrlY + Math.pow(t1, 2) * endY;
          const x2 = Math.pow(1 - t2, 2) * startX + 2 * (1 - t2) * t2 * ctrlX + Math.pow(t2, 2) * endX;
          const y2 = Math.pow(1 - t2, 2) * startY + 2 * (1 - t2) * t2 * ctrlY + Math.pow(t2, 2) * endY;

          // Толщина убывает к кончику
          const thickness = baseThickness * (1 - t1 * 0.8) + tipThickness * t1 * 0.8;

          if (params.UseStroke) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = params.StrokeColor;
            ctx.lineWidth = thickness + 2 * params.StrokeWidth;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = thickness;
          ctx.stroke();
        }

        // Центральная жилка (светлее)
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.strokeStyle = params.UseGradient ? params.GradientEndColor : lightenColor(params.color, 30);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // SVG травинка (упрощенная версия)
      const pathD = `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
      const svgPath = {
        type: 'path',
        d: pathD,
        stroke: svgStroke,
        fill: 'none',
        strokeWidth: baseThickness,
        strokeLinecap: 'round'
      };
      if (params.UseStroke) {
        svgPath.strokeOutline = { color: params.StrokeColor, width: params.StrokeWidth };
      }
      svgElements.push(svgPath);

      // SVG центральная жилка
      svgElements.push({
        type: 'path',
        d: pathD,
        stroke: params.UseGradient ? params.GradientEndColor : lightenColor(params.color, 30),
        fill: 'none',
        strokeWidth: 0.5,
        strokeLinecap: 'round'
      });
    }
  };

  // Вспомогательная функция для осветления цвета
  const lightenColor = (color, percent) => {
    // Простое осветление для hex цветов
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const r = Math.min(255, ((num >> 16) & 0xFF) + percent);
      const g = Math.min(255, ((num >> 8) & 0xFF) + percent);
      const b = Math.min(255, (num & 0xFF) + percent);
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
    return color;
  };

  // Пшеница - улучшенные стебли с детальными колосками и остями
  const drawGrassWheat = (ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor) => {
    const blades = Math.max(5, Math.min(params.blades, 20));
    const maxHeight = Math.max(60, Math.min(params.length * scale * scaleFactor, 250));
    const spreadWidth = Math.max(20, Math.min(params.spread * scale * scaleFactor, 150));
    const windAngle = (params.windDirection * Math.PI) / 180;

    for (let i = 0; i < blades; i++) {
      const heightRandom = seededRandom(i * 123, centerX + centerY);
      const posRandom = seededRandom(i * 456, centerX + centerY + 100);
      const thicknessRandom = seededRandom(i * 321, centerX + centerY + 300);

      const bladeHeight = maxHeight * (0.75 + heightRandom * 0.25);
      const xOffset = (posRandom - 0.5) * spreadWidth;
      const startX = centerX + xOffset;
      const startY = centerY;
      const baseThickness = Math.max(1, Math.min(params.thickness * 0.4 * scale * scaleFactor, 3)) * (0.8 + thicknessRandom * 0.2);

      // Стебель с изгибом и наклоном от ветра
      const curvature = Math.max(0.3, Math.min(params.curvature || 0.5, 1.5));
      const curveRandom = seededRandom(i * 789, centerX + centerY + 200);
      const endX = startX + Math.sin(windAngle) * bladeHeight * 0.2;
      const endY = startY - bladeHeight;
      const ctrlX = startX + (curveRandom - 0.5) * bladeHeight * curvature * 0.3 + Math.sin(windAngle) * bladeHeight * 0.15;
      const ctrlY = startY - bladeHeight * 0.6;

      let strokeStyle = params.color;
      let svgStroke = params.color;

      if (params.UseGradient) {
        const gradientId = `wheatGrad_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const grad = createGradient(ctx, startX, startY, endX, endY, params.GradientStartColor, params.GradientEndColor, gradientId, svgDefs);
        strokeStyle = grad.canvasStyle;
        svgStroke = grad.svgStyle;
      }

      // Рисуем стебель с изгибом
      if (ctx) {
        ctx.lineCap = 'round';
        if (params.UseStroke) {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
          ctx.strokeStyle = params.StrokeColor;
          ctx.lineWidth = baseThickness + 2 * params.StrokeWidth;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = baseThickness;
        ctx.stroke();
      }

      // SVG стебель
      const pathD = `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
      const svgPath = {
        type: 'path',
        d: pathD,
        stroke: svgStroke,
        fill: 'none',
        strokeWidth: baseThickness,
        strokeLinecap: 'round'
      };
      if (params.UseStroke) {
        svgPath.strokeOutline = { color: params.StrokeColor, width: params.StrokeWidth };
      }
      svgElements.push(svgPath);

      // Рисуем улучшенный колосок с зернами и остями
      const grainCount = 6 + Math.floor(seededRandom(i * 987, centerX + centerY) * 4);
      const grainSize = baseThickness * 1.8;
      const grainSpacing = bladeHeight * 0.10;
      const grainColor = params.leafColor || '#D4A574';

      for (let j = 0; j < grainCount; j++) {
        const grainY = endY + j * grainSpacing;
        const side = j % 2 === 0 ? 1 : -1;
        const grainX = endX + side * grainSize * 0.7;
        const grainAngle = seededRandom(i * 222 + j, centerY) * Math.PI * 0.15 + side * 0.2;

        // Зерно (более детальное)
        if (ctx) {
          ctx.save();
          ctx.translate(grainX, grainY);
          ctx.rotate(grainAngle);

          // Основное зерно
          ctx.fillStyle = grainColor;
          ctx.beginPath();
          ctx.ellipse(0, 0, grainSize * 0.5, grainSize * 0.9, 0, 0, Math.PI * 2);
          ctx.fill();

          if (params.leafUseStroke) {
            ctx.strokeStyle = params.StrokeColor;
            ctx.lineWidth = params.StrokeWidth * 0.5;
            ctx.stroke();
          }

          // Бороздка на зерне
          ctx.strokeStyle = darkenColor(grainColor, 20);
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(0, -grainSize * 0.7);
          ctx.lineTo(0, grainSize * 0.7);
          ctx.stroke();

          // Ость (усик) от зерна
          const awnLength = grainSize * (2 + seededRandom(i * 333 + j, centerX) * 1.5);
          const awnAngle = seededRandom(i * 444 + j, centerY) * 0.3 - 0.15;

          ctx.strokeStyle = 'rgba(180, 160, 120, 0.6)';
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(0, -grainSize * 0.8);
          ctx.lineTo(Math.sin(awnAngle) * awnLength, -grainSize * 0.8 - Math.cos(awnAngle) * awnLength);
          ctx.stroke();

          ctx.restore();
        }

        // SVG зерно
        const svgGrain = {
          type: 'ellipse',
          cx: grainX, cy: grainY,
          rx: grainSize * 0.5, ry: grainSize * 0.9,
          fill: grainColor,
          rotation: grainAngle
        };
        if (params.leafUseStroke) {
          svgGrain.stroke = params.StrokeColor;
          svgGrain.strokeWidth = params.StrokeWidth * 0.5;
        }
        svgElements.push(svgGrain);

        // SVG бороздка
        const cos = Math.cos(grainAngle);
        const sin = Math.sin(grainAngle);
        const groove1X = grainX + sin * (-grainSize * 0.7);
        const groove1Y = grainY - cos * (-grainSize * 0.7);
        const groove2X = grainX + sin * (grainSize * 0.7);
        const groove2Y = grainY - cos * (grainSize * 0.7);

        svgElements.push({
          type: 'line',
          x1: groove1X, y1: groove1Y,
          x2: groove2X, y2: groove2Y,
          stroke: darkenColor(grainColor, 20),
          strokeWidth: 0.5
        });

        // SVG ость
        const awnLength = grainSize * (2 + seededRandom(i * 333 + j, centerX) * 1.5);
        const awnAngle = seededRandom(i * 444 + j, centerY) * 0.3 - 0.15;
        const awnBaseX = grainX + sin * (-grainSize * 0.8);
        const awnBaseY = grainY - cos * (-grainSize * 0.8);
        const totalAngle = grainAngle + awnAngle;
        const awnEndX = awnBaseX + Math.sin(totalAngle) * awnLength;
        const awnEndY = awnBaseY - Math.cos(totalAngle) * awnLength;

        svgElements.push({
          type: 'line',
          x1: awnBaseX, y1: awnBaseY,
          x2: awnEndX, y2: awnEndY,
          stroke: 'rgba(180, 160, 120, 0.6)',
          strokeWidth: 0.4
        });
      }
    }
  };

  // Вспомогательная функция для затемнения цвета
  const darkenColor = (color, percent) => {
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const r = Math.max(0, ((num >> 16) & 0xFF) - percent);
      const g = Math.max(0, ((num >> 8) & 0xFF) - percent);
      const b = Math.max(0, (num & 0xFF) - percent);
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
    return color;
  };

  // Дикая трава - очень изогнутая и хаотичная
  const drawGrassWild = (ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor) => {
    const blades = Math.max(5, Math.min(params.blades, 20));
    const maxHeight = Math.max(60, Math.min(params.length * scale * scaleFactor, 250));
    const spreadWidth = Math.max(20, Math.min(params.spread * scale * scaleFactor, 150));
    const curvature = Math.max(0.5, Math.min(params.curvature * 2, 2.5)); // Увеличенный изгиб
    const windAngle = (params.windDirection * Math.PI) / 180;

    for (let i = 0; i < blades; i++) {
      const heightRandom = seededRandom(i * 123, centerX + centerY);
      const posRandom = seededRandom(i * 456, centerX + centerY + 100);
      const curveRandom1 = seededRandom(i * 789, centerX + centerY + 200);
      const curveRandom2 = seededRandom(i * 654, centerX + centerY + 300);
      const thicknessRandom = seededRandom(i * 321, centerX + centerY + 400);

      const bladeHeight = maxHeight * (0.6 + heightRandom * 0.4);
      const xOffset = (posRandom - 0.5) * spreadWidth;
      const startX = centerX + xOffset;
      const startY = centerY;
      const baseThickness = Math.max(1, Math.min(params.thickness * 0.45 * scale * scaleFactor, 3.5)) * (0.7 + thicknessRandom * 0.3);

      // Двойной изгиб для S-образной кривой
      const midY = startY - bladeHeight * 0.5;
      const midX = startX + (curveRandom1 - 0.5) * bladeHeight * curvature;
      const endY = startY - bladeHeight;
      const endX = startX + Math.sin(windAngle) * bladeHeight * 0.6 + (curveRandom2 - 0.5) * bladeHeight * curvature * 0.5;

      let strokeStyle = params.color;
      let svgStroke = params.color;

      if (params.UseGradient) {
        const gradientId = `wildGrad_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const grad = createGradient(ctx, startX, startY, endX, endY, params.GradientStartColor, params.GradientEndColor, gradientId, svgDefs);
        strokeStyle = grad.canvasStyle;
        svgStroke = grad.svgStyle;
      }

      // Рисуем wild траву с bezier curve
      if (ctx) {
        ctx.lineCap = 'round';
        if (params.UseStroke) {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.bezierCurveTo(midX, midY, midX, midY - bladeHeight * 0.2, endX, endY);
          ctx.strokeStyle = params.StrokeColor;
          ctx.lineWidth = baseThickness + 2 * params.StrokeWidth;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(midX, midY, midX, midY - bladeHeight * 0.2, endX, endY);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = baseThickness;
        ctx.stroke();
      }

      // SVG с cubic bezier
      const pathD = `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${midX.toFixed(1)} ${midY.toFixed(1)}, ${midX.toFixed(1)} ${(midY - bladeHeight * 0.2).toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
      const svgPath = {
        type: 'path',
        d: pathD,
        stroke: svgStroke,
        fill: 'none',
        strokeWidth: baseThickness,
        strokeLinecap: 'round'
      };
      if (params.UseStroke) {
        svgPath.strokeOutline = { color: params.StrokeColor, width: params.StrokeWidth };
      }
      svgElements.push(svgPath);
    }
  };

  // Папоротник - стебель с боковыми листочками
  const drawGrassFern = (ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor) => {
    const blades = Math.max(5, Math.min(params.blades, 20));
    const maxHeight = Math.max(60, Math.min(params.length * scale * scaleFactor, 250));
    const spreadWidth = Math.max(20, Math.min(params.spread * scale * scaleFactor, 150));
    const windAngle = (params.windDirection * Math.PI) / 180;

    for (let i = 0; i < blades; i++) {
      const heightRandom = seededRandom(i * 123, centerX + centerY);
      const posRandom = seededRandom(i * 456, centerX + centerY + 100);
      const thicknessRandom = seededRandom(i * 321, centerX + centerY + 300);

      const bladeHeight = maxHeight * (0.7 + heightRandom * 0.3);
      const xOffset = (posRandom - 0.5) * spreadWidth;
      const startX = centerX + xOffset;
      const startY = centerY;
      const baseThickness = Math.max(1, Math.min(params.thickness * 0.35 * scale * scaleFactor, 2.5)) * (0.8 + thicknessRandom * 0.2);

      // Слегка изогнутый стебель с учетом параметра curvature
      const curvature = Math.max(0.3, Math.min(params.curvature || 0.5, 1.5));
      const curveRandom = seededRandom(i * 789, centerX + centerY + 200);
      const endX = startX + Math.sin(windAngle) * bladeHeight * 0.2;
      const endY = startY - bladeHeight;
      const ctrlX = startX + (curveRandom - 0.5) * bladeHeight * curvature * 0.25 + Math.sin(windAngle) * bladeHeight * 0.15;
      const ctrlY = startY - bladeHeight * 0.5;

      let strokeStyle = params.color;
      let svgStroke = params.color;

      if (params.UseGradient) {
        const gradientId = `fernGrad_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const grad = createGradient(ctx, startX, startY, endX, endY, params.GradientStartColor, params.GradientEndColor, gradientId, svgDefs);
        strokeStyle = grad.canvasStyle;
        svgStroke = grad.svgStyle;
      }

      // Рисуем главный стебель
      if (ctx) {
        ctx.lineCap = 'round';
        if (params.UseStroke) {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
          ctx.strokeStyle = params.StrokeColor;
          ctx.lineWidth = baseThickness + 2 * params.StrokeWidth;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = baseThickness;
        ctx.stroke();
      }

      // SVG главный стебель
      const mainPathD = `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
      const svgMainPath = {
        type: 'path',
        d: mainPathD,
        stroke: svgStroke,
        fill: 'none',
        strokeWidth: baseThickness,
        strokeLinecap: 'round'
      };
      if (params.UseStroke) {
        svgMainPath.strokeOutline = { color: params.StrokeColor, width: params.StrokeWidth };
      }
      svgElements.push(svgMainPath);

      // Добавляем боковые листочки
      const leafCount = 6 + Math.floor(seededRandom(i * 555, centerX + centerY) * 4);
      const leafSize = baseThickness * 3;

      for (let j = 1; j < leafCount; j++) {
        const leafT = j / leafCount;
        // Интерполяция по квадратичной кривой
        const leafPosX = (1 - leafT) * (1 - leafT) * startX + 2 * (1 - leafT) * leafT * ctrlX + leafT * leafT * endX;
        const leafPosY = (1 - leafT) * (1 - leafT) * startY + 2 * (1 - leafT) * leafT * ctrlY + leafT * leafT * endY;

        const side = j % 2 === 0 ? 1 : -1;
        const leafAngle = Math.atan2(endY - startY, endX - startX) + Math.PI / 2 * side + (seededRandom(i * 777 + j, centerX) - 0.5) * 0.3;
        const leafLength = leafSize * (1 - leafT * 0.3); // Листочки меньше к вершине

        const leafEndX = leafPosX + Math.cos(leafAngle) * leafLength;
        const leafEndY = leafPosY + Math.sin(leafAngle) * leafLength;

        if (ctx) {
          ctx.lineCap = 'round';
          if (params.leafUseStroke) {
            ctx.beginPath();
            ctx.moveTo(leafPosX, leafPosY);
            ctx.lineTo(leafEndX, leafEndY);
            ctx.strokeStyle = params.StrokeColor;
            ctx.lineWidth = baseThickness * 0.6 + 2 * params.StrokeWidth;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.moveTo(leafPosX, leafPosY);
          ctx.lineTo(leafEndX, leafEndY);
          ctx.strokeStyle = params.leafColor || params.color;
          ctx.lineWidth = baseThickness * 0.6;
          ctx.stroke();
        }

        // SVG листочки
        const svgLeafLine = {
          type: 'line',
          x1: leafPosX, y1: leafPosY, x2: leafEndX, y2: leafEndY,
          stroke: params.leafColor || params.color,
          strokeWidth: baseThickness * 0.6,
          strokeLinecap: 'round'
        };
        if (params.leafUseStroke) {
          svgLeafLine.strokeOutline = { color: params.StrokeColor, width: params.StrokeWidth };
        }
        svgElements.push(svgLeafLine);
      }
    }
  };

  // Главная функция drawGrass - роутер для разных типов
  const drawGrass = (ctx, centerX, centerY, svgElements, svgDefs) => {
    if (!isFinite(centerX) || !isFinite(centerY)) return;

    const scale = Math.min(screenSize.width || 600, 600) / 600;
    let scaleFactor = 0.95;
    const width = screenSize.width || 600;
    if (width <= 470) {
      scaleFactor = 1.15;
    } else if (width <= 520) {
      scaleFactor = 1.05;
    } else if (width <= 640) {
      scaleFactor = 0.95;
    } else if (width <= 768) {
      scaleFactor = 0.92;
    } else if (width <= 1024) {
      scaleFactor = 0.9;
    }

    // Вызываем соответствующую функцию в зависимости от типа травы/цветка
    switch (params.grassType) {
      case 'regular':
        drawGrassRegular(ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor);
        break;
      case 'wheat':
        drawGrassWheat(ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor);
        break;
      case 'wild':
        drawGrassWild(ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor);
        break;
      case 'fern':
        drawGrassFern(ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor);
        break;
      case 'clover':
        drawGrassClover(ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor);
        break;
      case 'dandelion':
        drawGrassDandelion(ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor);
        break;
      case 'chamomile':
        drawGrassChamomile(ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor);
        break;
      case 'cornflower':
        drawGrassCornflower(ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor);
        break;
      case 'bellflower':
        drawGrassBellflower(ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor);
        break;
      default:
        drawGrassRegular(ctx, centerX, centerY, svgElements, svgDefs, scale, scaleFactor);
        break;
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
      case 'grass':
        const grassTypes = ['regular', 'wheat', 'wild', 'fern', 'clover', 'dandelion', 'chamomile', 'cornflower', 'bellflower'];
        const randomGrassType = grassTypes[Math.floor(Math.random() * grassTypes.length)];
        newParams = {
          ...newParams,
          blades: randomBetween(3, 15),
          length: randomBetween(60, 200),
          thickness: randomBetween(2, 8),
          curvature: randomBetween(2, 15, 1) / 10,
          spread: randomBetween(20, 100),
          windDirection: randomBetween(-45, 45),
          grassType: randomGrassType,
          flowerSize: randomBetween(8, 20),
          petalCount: randomBetween(6, 12),
          flowerColor: leafColor1,
          flowerCenterColor: getRandomColor(),
          dandelionFluffy: Math.random() < 0.5,
          bellCount: randomBetween(2, 5),
          color: trunkColor,
          leafColor: getRandomColor()
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
          // На компьютере дерево выше, на мобильных ниже
          centerY = displayHeight * (isMobile ? 0.85 : 0.80);
          break;
        case 'flower':
          centerY = displayHeight * 0.75;
          break;
        case 'bush':
          centerY = displayHeight * 0.55;
          break;
        case 'grass':
          centerY = displayHeight * 0.75;
          break;
        default:
          centerY = displayHeight * (isMobile ? 0.85 : 0.80);
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
        } else if (plantType === 'grass') {
          drawGrass(tempCtx, centerX, centerY, tempSvgElements, tempSvgDefs);
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

    // Собираем defs из svgDefs и элементов с типом 'defs'
    const additionalDefs = svgElements.filter(el => el.type === 'defs').map(el => el.content).join('\n    ');
    const defsStr = svgDefs.join('\n    ') + (additionalDefs ? '\n    ' + additionalDefs : '');

    // Фильтруем элементы, исключая 'defs' которые уже в defsStr
    const svgElements_str = svgElements.filter(el => el.type !== 'defs').map(element => {
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
          let opacityAttr = '';
          if (element.opacity !== undefined && element.opacity !== 1) {
            opacityAttr = `opacity="${element.opacity}"`;
          }
          return `<circle cx="${element.cx}" cy="${element.cy}" r="${element.r}" fill="${element.fill}" ${circleStrokeAttrs} ${opacityAttr}/>`;
        case 'defs':
          // Специальный тип для вставки градиентов внутрь defs
          return element.content;
        case 'path':
          let pathStr = `<path d="${element.d}" fill="${element.fill}"`;
          if (element.transform) {
            pathStr += ` transform="${element.transform}"`;
          }
          if (element.stroke) {
            pathStr += ` stroke="${element.stroke}"`;
            if (element['stroke-width']) {
              pathStr += ` stroke-width="${element['stroke-width']}"`;
            } else if (element.strokeWidth) {
              pathStr += ` stroke-width="${element.strokeWidth}"`;
            }
            if (element['vector-effect']) {
              pathStr += ` vector-effect="${element['vector-effect']}"`;
            }
            if (element.strokeLinecap) {
              pathStr += ` stroke-linecap="${element.strokeLinecap}"`;
            }
          }
          // Поддержка обводки для path
          if (element.strokeOutline) {
            const outlineWidth = (element.strokeWidth || parseFloat(element['stroke-width'])) + 2 * element.strokeOutline.width;
            let outlineStr = `<path d="${element.d}" fill="none" stroke="${element.strokeOutline.color}" stroke-width="${outlineWidth}"`;
            if (element.strokeLinecap) {
              outlineStr += ` stroke-linecap="${element.strokeLinecap}"`;
            }
            outlineStr += ' />\n    ';
            pathStr = outlineStr + pathStr;
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
      case 'grass':
        const isFlower = ['clover', 'dandelion', 'chamomile', 'cornflower', 'bellflower'].includes(params.grassType);

        return (
          <>
            <div className="slider-group">
              <label className="slider-label">
                Количество: {params.blades}
              </label>
              <input
                type="range"
                min="2"
                max={isFlower ? 15 : 30}
                value={params.blades}
                onChange={(e) => handleParamChange('blades', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Высота: {params.length}
              </label>
              <input
                type="range"
                min="60"
                max="250"
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
                min="1"
                max="10"
                value={params.thickness}
                onChange={(e) => handleParamChange('thickness', parseInt(e.target.value))}
                className="slider"
              />
            </div>

            {/* Ползунки для обычной травы, пшеницы и папоротника */}
            {!isFlower && (
              <div className="slider-group">
                <label className="slider-label">
                  Изгиб: {params.curvature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.1"
                  value={params.curvature}
                  onChange={(e) => handleParamChange('curvature', parseFloat(e.target.value))}
                  className="slider"
                />
              </div>
            )}

            <div className="slider-group">
              <label className="slider-label">
                Разброс: {params.spread}
              </label>
              <input
                type="range"
                min="20"
                max="150"
                value={params.spread}
                onChange={(e) => handleParamChange('spread', parseInt(e.target.value))}
                className="slider"
              />
            </div>
            <div className="slider-group">
              <label className="slider-label">
                Направление ветра: {params.windDirection}°
              </label>
              <input
                type="range"
                min="-45"
                max="45"
                value={params.windDirection}
                onChange={(e) => handleParamChange('windDirection', parseInt(e.target.value))}
                className="slider"
              />
            </div>

            {/* Ползунки специфичные для цветов */}
            {isFlower && (
              <>
                <div className="slider-group">
                  <label className="slider-label">
                    Размер цветка: {params.flowerSize}
                  </label>
                  <input
                    type="range"
                    min="6"
                    max="30"
                    value={params.flowerSize}
                    onChange={(e) => handleParamChange('flowerSize', parseInt(e.target.value))}
                    className="slider"
                  />
                </div>

                {(params.grassType === 'dandelion' || params.grassType === 'chamomile' || params.grassType === 'cornflower') && (
                  <div className="slider-group">
                    <label className="slider-label">
                      Количество лепестков: {params.petalCount}
                    </label>
                    <input
                      type="range"
                      min="4"
                      max="16"
                      value={params.petalCount}
                      onChange={(e) => handleParamChange('petalCount', parseInt(e.target.value))}
                      className="slider"
                    />
                  </div>
                )}

                {params.grassType === 'dandelion' && (
                  <div className="slider-group">
                    <label className="slider-label" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>Пушистый одуванчик</span>
                      <input
                        type="checkbox"
                        checked={params.dandelionFluffy}
                        onChange={(e) => handleParamChange('dandelionFluffy', e.target.checked)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                    </label>
                  </div>
                )}

                {params.grassType === 'bellflower' && (
                  <div className="slider-group">
                    <label className="slider-label">
                      Колокольчиков на стебле: {params.bellCount}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={params.bellCount}
                      onChange={(e) => handleParamChange('bellCount', parseInt(e.target.value))}
                      className="slider"
                    />
                  </div>
                )}
              </>
            )}

            {/* Чекбоксы для обводки - доступны для всех типов травы */}
            <div className="slider-group">
              <label className="slider-label" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Обводка стебля</span>
                <input
                  type="checkbox"
                  checked={params.UseStroke}
                  onChange={(e) => handleParamChange('UseStroke', e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </label>
            </div>

            <div className="slider-group">
              <label className="slider-label" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Обводка листвы</span>
                <input
                  type="checkbox"
                  checked={params.leafUseStroke}
                  onChange={(e) => handleParamChange('leafUseStroke', e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </label>
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
          <div
            className={`preset-item ${plantType === 'grass' ? 'active' : ''}`}
            onClick={() => setPlantType('grass')}
          >
            <img src="/assets/preset-grass.png" alt="Grass" />
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
                {plantType === 'grass' ? (
                  <>
                    {/* Для травы/цветов - другие параметры */}
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
                        style={{ background: params.leafColor }}
                        onClick={() => setActiveColorPicker(activeColorPicker === 'leafColor' ? null : 'leafColor')}
                        title="Цвет листьев"
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
                        style={{ background: params.flowerColor }}
                        onClick={() => setActiveColorPicker(activeColorPicker === 'flowerColor' ? null : 'flowerColor')}
                        title="Цвет цветка"
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
                        style={{ background: params.flowerCenterColor }}
                        onClick={() => setActiveColorPicker(activeColorPicker === 'flowerCenterColor' ? null : 'flowerCenterColor')}
                        title="Цвет центра цветка"
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
                        style={{ background: params.color }}
                        onClick={() => setActiveColorPicker(activeColorPicker === 'color' ? null : 'color')}
                        title="Цвет стебля"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Для деревьев, цветов, кустов - старые параметры */}
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
                  </>
                )}
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
              <div
                className={`mobile-preset-item ${plantType === 'grass' ? 'active' : ''}`}
                onClick={() => setPlantType('grass')}
              >
                <img src="/assets/preset-grass.png" alt="Grass" />
              </div>
            </div>
          </div>
        </main>

        {/* Правая панель с параметрами */}
        <aside className="parameters-sidebar">
          <h2 className="parameters-title">Параметры</h2>

          {/* Мобильная панель выбора цвета - встроенная в начало параметров */}
          {activeColorPicker && isMobile && (
            <div className="mobile-color-picker-inline">
              <h3 className="mobile-color-picker-title">Выбор цвета</h3>
              <div className="mobile-color-swatches">
                {[
                  '#8B4513', '#A0522D', '#DEB887', '#CD853F', '#D2B48C', '#F4A460',
                  '#228B22', '#32CD32', '#7CFC00', '#9ACD32', '#6B8E23', '#008000',
                  '#FFD700', '#FFA500', '#FF6347', '#DC143C', '#8A2BE2', '#4B0082',
                  '#800080', '#FF1493', '#1E90FF', '#00CED1', '#FF69B4', '#20B2AA'
                ].map((color) => (
                  <div
                    key={color}
                    className="mobile-color-swatch"
                    style={{ background: color }}
                    onClick={() => {
                      handleParamChange(activeColorPicker, color);
                      if (activeColorPicker.includes('leaf')) {
                        handleParamChange('leafUseGradient', true);
                      } else {
                        handleParamChange('UseGradient', true);
                      }
                      setActiveColorPicker(null);
                    }}
                  />
                ))}
              </div>
              <div className="mobile-color-custom">
                <label className="mobile-color-custom-label">Или выберите свой цвет:</label>
                <input
                  type="color"
                  value={
                    activeColorPicker === 'leafGradientStartColor' ? params.leafGradientStartColor :
                    activeColorPicker === 'leafGradientEndColor' ? params.leafGradientEndColor :
                    activeColorPicker === 'GradientEndColor' ? params.GradientEndColor :
                    params.GradientStartColor
                  }
                  onChange={(e) => {
                    handleParamChange(activeColorPicker, e.target.value);
                    if (activeColorPicker.includes('leaf')) {
                      handleParamChange('leafUseGradient', true);
                    } else {
                      handleParamChange('UseGradient', true);
                    }
                  }}
                  className="mobile-color-input"
                />
              </div>
              <button
                onClick={() => setActiveColorPicker(null)}
                className="mobile-color-close-btn"
              >
                Готово
              </button>
            </div>
          )}

          {/* Выбор типа ствола */}
          {/* Селектор типа ствола/травы */}
          {plantType === 'grass' ? (
            <div className="trunk-type-selector">
              <label className="slider-label">Тип травы:</label>
              <select
                value={params.grassType}
                onChange={(e) => handleParamChange('grassType', e.target.value)}
                className="trunk-type-dropdown"
              >
                <option value="regular">Обычная трава</option>
                <option value="wheat">Пшеница</option>
                <option value="wild">Дикая трава</option>
                <option value="fern">Папоротник</option>
                <option value="clover">Клевер</option>
                <option value="dandelion">Одуванчик</option>
                <option value="chamomile">Ромашка</option>
                <option value="cornflower">Василек</option>
                <option value="bellflower">Колокольчик</option>
              </select>
            </div>
          ) : (plantType === 'tree' || plantType === 'flower' || plantType === 'bush') ? (
            <div className="trunk-type-selector">
              <label className="slider-label">Тип ствола:</label>
              <select
                value={params.trunkType}
                onChange={(e) => handleParamChange('trunkType', e.target.value)}
                className="trunk-type-dropdown"
              >
                <option value="straight">Прямой</option>
                <option value="organic">Органический</option>
              </select>
            </div>
          ) : null}

          {/* Слайдеры */}
          <div className="controls-section">
            {renderSliders()}
          </div>

          {/* Чекбоксы обводки (только для tree, flower, bush) */}
          {plantType !== 'grass' && (
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
          )}

          {/* PhotoshopPicker встроенный в панель (только для десктопа) */}
          {activeColorPicker && !isMobile && (
            <div className="photoshop-picker-wrapper">
              <PhotoshopPicker
                color={
                  activeColorPicker === 'leafGradientStartColor' ? params.leafGradientStartColor :
                  activeColorPicker === 'leafGradientEndColor' ? params.leafGradientEndColor :
                  activeColorPicker === 'GradientEndColor' ? params.GradientEndColor :
                  activeColorPicker === 'GradientStartColor' ? params.GradientStartColor :
                  activeColorPicker === 'color' ? params.color :
                  activeColorPicker === 'leafColor' ? params.leafColor :
                  activeColorPicker === 'flowerColor' ? params.flowerColor :
                  activeColorPicker === 'flowerCenterColor' ? params.flowerCenterColor :
                  params.color
                }
                onAccept={() => setActiveColorPicker(null)}
                onCancel={() => setActiveColorPicker(null)}
                onChange={(color) => {
                  handleParamChange(activeColorPicker, color.hex);
                  if (activeColorPicker.includes('leaf') && activeColorPicker !== 'leafColor') {
                    handleParamChange('leafUseGradient', true);
                  } else if (activeColorPicker.includes('Gradient')) {
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
            <button onClick={() => setRandomSeed(prev => prev + 1)} className="btn-generate">
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