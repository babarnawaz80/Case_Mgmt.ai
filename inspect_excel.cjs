const fs = require('fs');
const xlsx = require('xlsx');

try {
  const filePath = '/Users/kamal/Documents/CaseManagement.ai/test CaseManagementAI_Individual_Import.xlsx';
  console.log('Reading file from:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('File does not exist!');
    process.exit(1);
  }
  
  const buf = fs.readFileSync(filePath);
  const workbook = xlsx.read(buf, { type: 'buffer' });
  
  console.log('Sheet Names:', workbook.SheetNames);
  
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  
  // Read first 15 rows as raw arrays to see structure
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log('\n--- First 15 Rows ---');
  for (let i = 0; i < Math.min(15, rawRows.length); i++) {
    console.log(`Row ${i + 1}:`, rawRows[i]);
  }
} catch (err) {
  console.error('Error inspecting excel file:', err);
}
