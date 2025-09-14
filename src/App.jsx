import React, { useState, useRef, useEffect } from 'react';

const PlantGenerator = () => {
  const canvasRef = useRef();
  const [plantType, setPlantType] = useState('tree');
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
    centerSize: 12,
    centerColor: '#FFD700'
  });
  
  const [svgElements, setSvgElements] = useState([]);

  useEffect(() => {
    generatePlant();
  }, [plantType, params]);

  const generatePlant = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Фиксированный размер canvas для стабильности
    const canvasWidth = 800;
    const canvasHeight = 600;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    const centerX = canvasWidth / 2;
    let centerY;

    switch (plantType) {
      case 'tree':
      case 'flower':
        centerY = canvasHeight - 50; // У основания
        break;
      case 'bush':
        centerY = canvasHeight / 2; // Точно посередине
        break;
      default:
        centerY = canvasHeight - 50;
    }
    
    const tempSvgElements = [];
    
    try {
      if (plantType === 'tree') {
        drawTree(ctx, centerX, centerY, params.length, -Math.PI/2, params.thickness, params.levels, tempSvgElements);
      } else if (plantType === 'flower') {
        drawFlower(ctx, centerX, centerY, tempSvgElements);
      } else if (plantType === 'bush') {
        drawBush(ctx, centerX, centerY, tempSvgElements);
      }
    } catch (e) {
      console.error('Error generating plant:', e);
    }
    
    setSvgElements(tempSvgElements);
  };

  const drawTree = (ctx, x, y, length, angle, thickness, level, svgElements) => {
    // Строгие ограничения для предотвращения проблем
    if (level <= 0 || length < 3 || thickness < 0.5 || level > 8) return;
    
    // Безопасные ограничения
    length = Math.max(3, Math.min(length, 200));
    thickness = Math.max(0.5, Math.min(thickness, 30));
    
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    
    // Проверка валидности координат
    if (!isFinite(endX) || !isFinite(endY) || !isFinite(x) || !isFinite(y)) return;
    
    // Рисуем ветку на canvas
    if (ctx) {
      ctx.strokeStyle = params.color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    
    // Сохраняем для SVG
    svgElements.push({
      type: 'line',
      x1: x, y1: y, x2: endX, y2: endY,
      stroke: params.color,
      strokeWidth: thickness
    });
    
    // Листья на концах веток
    if (level <= 2 && Math.random() < params.leafDensity) {
      drawLeaf(ctx, endX, endY, svgElements);
    }
    
    // Рекурсивные ветки
    const newLength = length * 0.75;
    const newThickness = Math.max(0.5, thickness * 0.7);
    const angleStep = params.angle * Math.PI / 180;
    const maxBranches = Math.min(params.branches, 6); // Ограничение
    
    for (let i = 0; i < maxBranches; i++) {
      const branchAngle = angle + (angleStep * (i - maxBranches/2 + 0.5)) + (Math.random() - 0.5) * 0.2;
      drawTree(ctx, endX, endY, newLength, branchAngle, newThickness, level - 1, svgElements);
    }
  };

  const drawLeaf = (ctx, x, y, svgElements) => {
    if (!isFinite(x) || !isFinite(y)) return;
    
    const rotation = Math.random() * Math.PI * 2;
    const rx = Math.max(2, params.leafSize / 2);
    const ry = Math.max(3, params.leafSize);
    
    // Рисуем на canvas
    if (ctx) {
      ctx.fillStyle = params.leafColor;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // Сохраняем для SVG
    svgElements.push({
      type: 'ellipse',
      cx: x, cy: y,
      rx, ry,
      fill: params.leafColor,
      rotation: rotation
    });
  };

  const drawFlower = (ctx, centerX, centerY, svgElements) => {
    if (!isFinite(centerX) || !isFinite(centerY)) return;
    
    const stemLength = Math.max(30, Math.min(params.length, 250));
    const stemEndY = centerY - stemLength;
    const stemThickness = Math.max(2, Math.min(params.thickness, 15));
    
    // Рисуем стебель
    if (ctx) {
      ctx.strokeStyle = params.color;
      ctx.lineWidth = stemThickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX, stemEndY);
      ctx.stroke();
    }
    
    svgElements.push({
      type: 'line',
      x1: centerX, y1: centerY, x2: centerX, y2: stemEndY,
      stroke: params.color,
      strokeWidth: stemThickness
    });
    
    // Рисуем лепестки
    const petals = Math.max(3, Math.min(params.branches, 15));
    const petalLength = Math.max(10, Math.min(params.leafSize * 2, 50));
    
    for (let i = 0; i < petals; i++) {
      const angle = (i * Math.PI * 2) / petals;
      const petalX = centerX + Math.cos(angle) * petalLength;
      const petalY = stemEndY + Math.sin(angle) * petalLength;
      
      const rx = Math.max(3, petalLength / 3);
      const ry = Math.max(2, petalLength / 6);
      
      if (ctx) {
        ctx.fillStyle = params.leafColor;
        ctx.save();
        ctx.translate(petalX, petalY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      svgElements.push({
        type: 'ellipse',
        cx: petalX, cy: petalY,
        rx, ry,
        fill: params.leafColor,
        rotation: angle
      });
    }
    
    // Центр цветка
    const centerRadius = Math.max(3, Math.min(params.centerSize, 25));
    if (ctx) {
      ctx.fillStyle = params.centerColor;
      ctx.beginPath();
      ctx.arc(centerX, stemEndY, centerRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    svgElements.push({
      type: 'circle',
      cx: centerX, cy: stemEndY, r: centerRadius,
      fill: params.centerColor
    });
  };

  const drawBush = (ctx, centerX, centerY, svgElements) => {
    if (!isFinite(centerX) || !isFinite(centerY)) return;
    
    const branches = Math.max(4, Math.min(params.branches * 2, 16));
    
    for (let i = 0; i < branches; i++) {
      const angle = Math.random() * Math.PI * 2;
      const length = Math.max(25, params.length * (0.5 + Math.random() * 0.4));
      const thickness = Math.max(1, params.thickness * 0.6);
      
      drawTree(ctx, centerX, centerY, length, angle - Math.PI/2, thickness, 
        Math.max(1, Math.min(params.levels, 4)), svgElements);
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
    const svgWidth = 800;
    const svgHeight = 600;
    
    const svgElements_str = svgElements.map(element => {
      switch (element.type) {
        case 'line':
          return `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${element.stroke}" stroke-width="${element.strokeWidth}" stroke-linecap="round"/>`;
        case 'ellipse':
          const transform = element.rotation ? `transform="rotate(${element.rotation * 180 / Math.PI} ${element.cx} ${element.cy})"` : '';
          return `<ellipse cx="${element.cx}" cy="${element.cy}" rx="${element.rx}" ry="${element.ry}" fill="${element.fill}" ${transform}/>`;
        case 'circle':
          return `<circle cx="${element.cx}" cy="${element.cy}" r="${element.r}" fill="${element.fill}"/>`;
        default:
          return '';
      }
    }).join('\n    ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
    ${svgElements_str}
</svg>`;
  };

  const renderSliders = () => {
    switch (plantType) {
      case 'tree':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество веток: {params.branches}
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={params.branches}
                onChange={(e) => handleParamChange('branches', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Длина веток: {params.length}
              </label>
              <input
                type="range"
                min="40"
                max="120"
                value={params.length}
                onChange={(e) => handleParamChange('length', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Угол веток: {params.angle}°
              </label>
              <input
                type="range"
                min="10"
                max="45"
                value={params.angle}
                onChange={(e) => handleParamChange('angle', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Толщина ствола: {params.thickness}
              </label>
              <input
                type="range"
                min="3"
                max="15"
                value={params.thickness}
                onChange={(e) => handleParamChange('thickness', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Уровни ветвления: {params.levels}
              </label>
              <input
                type="range"
                min="2"
                max="6"
                value={params.levels}
                onChange={(e) => handleParamChange('levels', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Размер листьев: {params.leafSize}
              </label>
              <input
                type="range"
                min="6"
                max="20"
                value={params.leafSize}
                onChange={(e) => handleParamChange('leafSize', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Густота листвы: {Math.round(params.leafDensity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={params.leafDensity}
                onChange={(e) => handleParamChange('leafDensity', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цвет ствола
                </label>
                <input
                  type="color"
                  value={params.color}
                  onChange={(e) => handleParamChange('color', e.target.value)}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цвет листьев
                </label>
                <input
                  type="color"
                  value={params.leafColor}
                  onChange={(e) => handleParamChange('leafColor', e.target.value)}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
            </div>
          </>
        );
      case 'bush':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество веток: {params.branches}
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={params.branches}
                onChange={(e) => handleParamChange('branches', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Длина веток: {params.length}
              </label>
              <input
                type="range"
                min="30"
                max="100"
                value={params.length}
                onChange={(e) => handleParamChange('length', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Угол веток: {params.angle}°
              </label>
              <input
                type="range"
                min="10"
                max="60"
                value={params.angle}
                onChange={(e) => handleParamChange('angle', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Толщина веток: {params.thickness}
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={params.thickness}
                onChange={(e) => handleParamChange('thickness', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Уровни ветвления: {params.levels}
              </label>
              <input
                type="range"
                min="1"
                max="4"
                value={params.levels}
                onChange={(e) => handleParamChange('levels', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Размер листьев: {params.leafSize}
              </label>
              <input
                type="range"
                min="5"
                max="15"
                value={params.leafSize}
                onChange={(e) => handleParamChange('leafSize', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Густота листвы: {Math.round(params.leafDensity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={params.leafDensity}
                onChange={(e) => handleParamChange('leafDensity', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цвет веток
                </label>
                <input
                  type="color"
                  value={params.color}
                  onChange={(e) => handleParamChange('color', e.target.value)}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цвет листьев
                </label>
                <input
                  type="color"
                  value={params.leafColor}
                  onChange={(e) => handleParamChange('leafColor', e.target.value)}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
            </div>
          </>
        );
      case 'flower':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество лепестков: {params.branches}
              </label>
              <input
                type="range"
                min="3"
                max="12"
                value={params.branches}
                onChange={(e) => handleParamChange('branches', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Длина стебля: {params.length}
              </label>
              <input
                type="range"
                min="50"
                max="150"
                value={params.length}
                onChange={(e) => handleParamChange('length', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Толщина стебля: {params.thickness}
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={params.thickness}
                onChange={(e) => handleParamChange('thickness', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Размер лепестков: {params.leafSize}
              </label>
              <input
                type="range"
                min="6"
                max="20"
                value={params.leafSize}
                onChange={(e) => handleParamChange('leafSize', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Размер центра: {params.centerSize}
              </label>
              <input
                type="range"
                min="5"
                max="20"
                value={params.centerSize}
                onChange={(e) => handleParamChange('centerSize', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цвет стебля
                </label>
                <input
                  type="color"
                  value={params.color}
                  onChange={(e) => handleParamChange('color', e.target.value)}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цвет лепестков
                </label>
                <input
                  type="color"
                  value={params.leafColor}
                  onChange={(e) => handleParamChange('leafColor', e.target.value)}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цвет центра
                </label>
                <input
                  type="color"
                  value={params.centerColor}
                  onChange={(e) => handleParamChange('centerColor', e.target.value)}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-green-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-green-800 mb-8">
          🌳 Генератор Растений 🌸
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Параметры</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип растения
              </label>
              <select 
                value={plantType}
                onChange={(e) => setPlantType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="tree">🌳 Дерево</option>
                <option value="flower">🌸 Цветок</option>
                <option value="bush">🌿 Куст</option>
              </select>
            </div>

            <div className="space-y-4">
              {renderSliders()}
            </div>

            <button
              onClick={generatePlant}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105"
            >
              🌱 Сгенерировать растение
            </button>

            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>
                📥 Скачать
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <button
                  onClick={downloadPNG}
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    fontWeight: '500',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                >
                  📷 PNG HD
                </button>
                <button
                  onClick={downloadSVG}
                  style={{
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    fontWeight: '500',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#6d28d9'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#7c3aed'}
                >
                  🎨 SVG векторный
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                PNG HD - высокое качество, SVG - векторный формат
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
                Твое растение
              </h2>
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  width="800"
                  height="600"
                  className="border border-gray-200 rounded-lg bg-gradient-to-b from-blue-50 to-green-50"
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </div>
            </div>

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">💡 Подсказки:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Попробуй разные типы растений</li>
                <li>• Экспериментируй с углом и количеством веток</li>
                <li>• Уменьши густоту листвы для зимнего куста или дерева</li>
                <li>• Каждая генерация добавляет случайность!</li>
                <li>• Теперь SVG и PNG полностью идентичны</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlantGenerator;