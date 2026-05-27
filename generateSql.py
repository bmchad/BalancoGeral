import os
import re

def parseCsvRow(s):
    inQuote = False
    row = []
    col = ''
    for c in s:
        if c == '"':
            inQuote = not inQuote
        elif c == ';' and not inQuote:
            row.append(col.strip())
            col = ''
        else:
            col += c
    row.append(col.strip())
    return row

def parseCurrency(s):
    if not s: return None
    clean = s.replace('"', '').replace('R$ ', '').replace('R$', '').strip()
    clean = re.sub(r'^-R\$\s*', '-', clean)
    if clean == '': return None
    clean = clean.replace('.', '').replace(',', '.')
    try:
        num = float(clean)
        return num
    except ValueError:
        return None

try:
    with open('planilha_2025.csv', 'r', encoding='latin1') as f:
        lines = f.read().split('\n')
except FileNotFoundError:
    print("planilha_2025.csv not found.")
    exit(1)

csvLines = []
start = False
for line in lines:
    if '01/01/2025' in line:
        start = True
    if start and line.strip() != '':
        csvLines.append(line.strip())

dates = [
    '2025-01-05', '2025-02-05', '2025-03-05', '2025-04-05', '2025-05-05', '2025-06-05',
    '2025-07-05', '2025-08-05', '2025-09-05', '2025-10-05', '2025-11-05', '2025-12-05'
]

categoryMap = {
    'Comida': 'Comida',
    'Uber/99': 'Uber/99',
    'Táxi': 'Táxi',
    'Ônibus': 'Ônibus/Metrô',
    'Supermercado': 'Supermercado',
    'Academia': 'Academia',
    'Vestuário/Beleza': 'Vestuário/Beleza',
    'Farmácia': 'Farmácia',
    'Eletrônicos': 'Eletrônicos',
    'Casa/Aloja': 'Casa',
    'Comércio': 'Comércio',
    'Governo': 'Governo',
    'Educação': 'Educação',
    'Viagem': 'Viagem',
    'Médicos/Saúde': 'Médicos/Saúde',
    'Entreterimento': 'Entreterimento',
    'Assinaturas': 'Assinaturas',
    'Bancos': 'Bancos',
    'Outros': 'Outros',
    'Paulo': 'Paulo',
    'Larissa': 'Larissa',
    'Maria': 'Maria',
    'Poker': 'Poker',
}

sql = """-- Ensure categories exist
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
    IF NOT EXISTS (SELECT 1 FROM categories WHERE nome = 'Maria' AND user_id = uid) THEN
        INSERT INTO categories (user_id, nome, cor) VALUES (uid, 'Maria', '#a855f7');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM categories WHERE nome = 'Poker' AND user_id = uid) THEN
        INSERT INTO categories (user_id, nome, cor) VALUES (uid, 'Poker', '#f59e0b');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM categories WHERE nome = 'Outras Receitas' AND user_id = uid) THEN
        INSERT INTO categories (user_id, nome, cor) VALUES (uid, 'Outras Receitas', '#10b981');
    END IF;
END $$;

INSERT INTO public.transactions (user_id, data, nome, apelido, valor, banco, pendente, categoria_id, parcela_atual, parcela_total, hora)
VALUES
"""

values = []

# Parse Receitas
inReceita = False
for i in range(len(csvLines)):
    row = parseCsvRow(csvLines[i])
    if len(row) == 0: continue
    label = row[0].replace('"', '').strip()

    if label == 'Receita' and i > 10:
        inReceita = True
        continue
    if label in ['Total', 'Despesas', 'Parcelas']:
        inReceita = False
        continue

    if inReceita and label in ['Paulo', 'Larissa', 'Maria', 'Poker', 'Outros']:
        catName = 'Outras Receitas' if label == 'Outros' else label
        for c in range(1, 5): # aqui mudar pois só quero até, incluindo, o mês 4
            if c < len(row):
                val = parseCurrency(row[c])
                if val is not None and val != 0:
                    values.append(f"((SELECT id FROM auth.users LIMIT 1), '{dates[c - 1]}', '{catName}', '{catName}', {val}, NULL, true, (SELECT id FROM categories WHERE nome = '{catName}' AND user_id = (SELECT id FROM auth.users LIMIT 1) LIMIT 1), NULL, NULL, '12:00:00')")

# Parse Despesas
inDespesas = False
for i in range(len(csvLines)):
    row = parseCsvRow(csvLines[i])
    if len(row) == 0: continue
    label = row[0].replace('"', '').strip()

    if label == 'Despesas' and i < 30:
        inDespesas = True
        continue
    if label in ['Total', 'Receita', 'Parcelas']:
        inDespesas = False
        continue

    if inDespesas and label != '' and label not in ['Parcelas', 'Investimentos', 'Resultado', 'Despesas', 'Cartão']:
        catName = categoryMap.get(label, label)
        for c in range(1, 13):
            if c < len(row):
                val = parseCurrency(row[c])
                if val is not None and val != 0:
                    final_val = -abs(val)
                    values.append(f"((SELECT id FROM auth.users LIMIT 1), '{dates[c - 1]}', '{catName}', '{catName}', {final_val}, NULL, true, (SELECT id FROM categories WHERE nome = '{catName}' AND user_id = (SELECT id FROM auth.users LIMIT 1) LIMIT 1), NULL, NULL, '12:00:00')")

# Parse Parcelas
inParcelas = False
for i in range(len(csvLines)):
    row = parseCsvRow(csvLines[i])
    if len(row) == 0: continue
    label = row[0].replace('"', '').strip()

    if label == 'Parcelas':
        inParcelas = True
        continue

    if inParcelas and re.match(r'^\d+\)$', label):
        valRow = row
        motivoRow = parseCsvRow(csvLines[i + 1]) if i + 1 < len(csvLines) else []
        rawMotivo = motivoRow[1].replace('"', '').strip() if len(motivoRow) > 1 and motivoRow[1] else 'Parcela'
        catName = rawMotivo

        parcels2025 = []
        for c in range(1, 13):
            if c < len(valRow):
                val = parseCurrency(valRow[c])
                if val is not None and val != 0:
                    parcels2025.append({'monthIndex': c - 1, 'val': val})

        if len(parcels2025) > 0:
            total = len(parcels2025)
            for index, p in enumerate(parcels2025):
                current = index + 1
                final_val = -abs(p['val'])
                values.append(f"((SELECT id FROM auth.users LIMIT 1), '{dates[p['monthIndex']]}', '{catName}', '{catName}', {final_val}, NULL, true, NULL, {current}, {total}, '12:00:00')")

sql += ',\n'.join(values) + ';'

with open('seed2py.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print("SQL file generated successfully (seed2py.sql).")
