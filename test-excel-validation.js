const ExcelJS = require('exceljs');

async function test() {
  const workbook = new ExcelJS.Workbook();
  const mainSheet = workbook.addWorksheet('Main');
  const dataSheet = workbook.addWorksheet('DataValidation', { state: 'hidden' });
  
  // Add data to hidden sheet
  const courses = ['Course A', 'Course B', 'Course C'];
  dataSheet.getColumn('A').values = ['Courses', ...courses];
  
  // Main sheet headers
  mainSheet.columns = [
    { header: 'Student Name', key: 'name', width: 20 },
    { header: 'Course', key: 'course', width: 20 }
  ];
  
  // Add data validation referencing the hidden sheet
  mainSheet.dataValidations.add('B2:B9999', {
    type: 'list',
    allowBlank: true,
    formulae: [`DataValidation!$A$2:$A$${courses.length + 1}`]
  });
  
  await workbook.xlsx.writeFile('test_validation.xlsx');
  console.log('✅ Success! File test_validation.xlsx generated');
}

test().catch(console.error);
