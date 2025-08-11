const fs = require('fs');
const path = require('path');

// Função para criar um PNG simples usando canvas (simulado)
function createSimplePNG(width, height, filename) {
  // Para este exemplo, vou criar um PNG básico usando base64
  // Em produção, você usaria uma biblioteca como sharp ou canvas
  
  const canvas = {
    width: width,
    height: height
  };
  
  // Criar um PNG simples com fundo verde e "P" branco
  const pngData = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#16a34a"/>
      <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${width/4}" font-weight="bold" fill="white">P</text>
    </svg>
  `, 'utf8');
  
  fs.writeFileSync(path.join(__dirname, '..', 'public', filename), pngData);
  console.log(`Created ${filename}`);
}

// Gerar os ícones
createSimplePNG(192, 192, 'icon-192x192.png');
createSimplePNG(512, 512, 'icon-512x512.png');

console.log('Icons generated successfully!'); 