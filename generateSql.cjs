const fs = require('fs');

const fileContent = fs.readFileSync('C:\\Users\\berna\\.gemini\\antigravity\\brain\\dc20a5f8-0ce7-4903-aeb7-8cf5079e4cad\\.system_generated\\steps\\571\\content.md', 'utf-8');

const lines = fileContent.split('\n');
let csvLines = [];
let start = false;
for (let line of lines) {
  if (line.startsWith(',1/1/2024')) {
    start = true;
  }
  if (start && line.trim() !== '') {
    csvLines.push(line.trim());
  }
}

// Columns: 1 to 12 are Jan-Dec 2024.
const dates = [
  '2024-01-01', '2024-02-05', '2024-03-03', '2024-04-01', '2024-05-06', '2024-06-01',
  '2024-07-01', '2024-08-05', '2024-09-05', '2024-10-05', '2024-11-05', '2024-12-05'
];

const categoryMap = {
  'Almoço': 'Comida',
  'Ifood/comida': 'Comida',
  'Uber': 'Uber/99',
  'Táxi': 'Táxi',
  'Sandra': 'Ônibus/Metrô',
  'Cartão': 'Assinaturas',
  'Academia': 'Academia',
  'Vestuário': 'Vestuário/Beleza',
  'Farmácia': 'Farmácia',
  'Eletrônicos': 'Eletrônicos',
  'Casa': 'Casa',
  'Amazon/Shope': 'Comércio',
  'Governo': 'Governo',
  'Educação': 'Educação',
  'Viagem': 'Viagem',
  'Entreterimento': 'Entreterimento',
  'Streaming': 'Assinaturas',
  'Outros': 'Comércio'
};

function parseCsvRow(str) {
  let inQuote = false;
  let row = [];
  let col = '';
  for(let i=0; i<str.length; i++) {
    const c = str[i];
    if (c === '"') {
      inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      row.push(col.trim());
      col = '';
    } else {
      col += c;
    }
  }
  row.push(col.trim());
  return row;
}

function parseCurrency(str) {
  if (!str) return null;
  let clean = str.replace(/"/g, '').replace('R$ ', '').replace('R$', '').replace(/-R\$\s*/, '-').trim();
  if (clean === '') return null;
  // Handle dots as thousands and comma as decimal
  clean = clean.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  if (isNaN(num)) return null;
  return num;
}

let sql = `
-- Ensure categories exist
DO $$
DECLARE
    uid uuid := (SELECT id FROM auth.users LIMIT 1);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM categories WHERE nome = 'Paulo' AND user_id = uid) THEN
        INSERT INTO categories (user_id, nome, cor) VALUES (uid, 'Paulo', '#64748b');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM categories WHERE nome = 'Larissa' AND user_id = uid) THEN
        INSERT INTO categories (user_id, nome, cor) VALUES (uid, 'Larissa', '#ef4444');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM categories WHERE nome = 'Outras Receitas' AND user_id = uid) THEN
        INSERT INTO categories (user_id, nome, cor) VALUES (uid, 'Outras Receitas', '#10b981');
    END IF;
END $$;

INSERT INTO public.transactions (user_id, data, nome, apelido, valor, banco, pendente, categoria_id, parcela_atual, parcela_total, hora)
VALUES
`;

let values = [];

// Parse Receitas (Lines 38 to 40 roughly, where it says "Receita" down to "Total")
let inReceita = false;
for (let i=0; i<csvLines.length; i++) {
  const row = parseCsvRow(csvLines[i]);
  const label = row[0].replace(/"/g, '').trim();
  
  // Notice: there's two "Receita" sections. The actual inputs are Paulo, Larissa, Outros around line 38.
  if (label === 'Receita') { inReceita = true; continue; }
  if (label === 'Total' && inReceita) { inReceita = false; continue; }
  
  if (inReceita && (label === 'Paulo' || label === 'Larissa' || label === 'Outros')) {
    const catName = label === 'Outros' ? 'Outras Receitas' : label;
    for (let c=1; c<=12; c++) {
      const val = parseCurrency(row[c]);
      if (val && val !== 0) {
        values.push(`((SELECT id FROM auth.users LIMIT 1), '${dates[c-1]}', '${catName}', '${catName}', ${val}, NULL, false, (SELECT id FROM categories WHERE nome = '${catName}' AND user_id = (SELECT id FROM auth.users LIMIT 1) LIMIT 1), NULL, NULL, '12:00:00')`);
      }
    }
  }
}

// Parse Despesas (Lines 15 to 34)
let inDespesas = false;
for (let i=0; i<csvLines.length; i++) {
  const row = parseCsvRow(csvLines[i]);
  const label = row[0].replace(/"/g, '').trim();
  
  if (label === 'Despesas' && i < 30) { inDespesas = true; continue; }
  if (label === 'Total' && inDespesas) { inDespesas = false; continue; }
  
  if (inDespesas && label !== '' && label !== 'Parcelas' && label !== 'Investimentos' && label !== 'Resultado' && label !== 'Despesas') {
    const catName = categoryMap[label] || label;
    for (let c=1; c<=12; c++) {
      const val = parseCurrency(row[c]);
      if (val && val !== 0) {
        // Values in spreadsheet are positive for expenses, so we negate them
        values.push(`((SELECT id FROM auth.users LIMIT 1), '${dates[c-1]}', '${catName}', '${catName}', -${val}, NULL, false, (SELECT id FROM categories WHERE nome = '${catName}' AND user_id = (SELECT id FROM auth.users LIMIT 1) LIMIT 1), NULL, NULL, '12:00:00')`);
      }
    }
  }
}

// Parse Parcelas
let inParcelas = false;
for (let i=0; i<csvLines.length; i++) {
  const row = parseCsvRow(csvLines[i]);
  const label = row[0].replace(/"/g, '').trim();
  
  if (label === 'Parcelas') { inParcelas = true; continue; }
  
  if (inParcelas && label.match(/^\d+\)$/)) {
    const valRow = row;
    const motivoRow = parseCsvRow(csvLines[i+1]);
    const rawMotivo = motivoRow[1] ? motivoRow[1].replace(/"/g, '').trim() : 'Parcela';
    const catName = rawMotivo; 
    
    // Find installments only in 2024 (col 1 to 12 in the parcelas table, wait... 
    // Parcelas header has 1/1/2024 to 12/1/2025.
    // So cols 1 to 12 are 2024. Cols 13+ are 2025.
    let parcels2024 = [];
    for (let c=1; c<=12; c++) {
      const val = parseCurrency(valRow[c]);
      if (val && val !== 0) {
        parcels2024.push({ monthIndex: c-1, val: val });
      }
    }
    
    if (parcels2024.length > 0) {
      let total = parcels2024.length;
      parcels2024.forEach((p, index) => {
        const current = index + 1;
        values.push(`((SELECT id FROM auth.users LIMIT 1), '${dates[p.monthIndex]}', '${catName}', '${catName}', -${p.val}, NULL, false, NULL, ${current}, ${total}, '12:00:00')`);
      });
    }
  }
}

sql += values.join(',\n') + ';';

fs.writeFileSync('C:\\Users\\berna\\.gemini\\antigravity\\scratch\\balanco-geral\\seed.sql', sql);
console.log("SQL file generated successfully.");
