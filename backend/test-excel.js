import ExcelJS from 'exceljs';

async function test() {
  const workbook = new ExcelJS.Workbook();
  const mainSheet = workbook.addWorksheet('Main');
  const dataSheet = workbook.addWorksheet('DataValidation');
  dataSheet.state = 'hidden';
  
  const courses = ['Course A', 'Course B', 'Course C'];
  dataSheet.getColumn('A').values = ['Courses', ...courses];
  
  mainSheet.columns = [
    { header: 'Student Name', key: 'name', width: 20 },
    { header: 'Course', key: 'course', width: 20 }
  ];
  
  for (let i = 2; i <= 500; i++) {
    const cell = mainSheet.getCell(`B${i}`);
    cell.dataValidation = {
      type: 'list',
      allowBlank: true,
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid Selection',
      error: 'Please select a value from the drop-down list.',
      formulae: [`DataValidation!$A$2:$A$${courses.length + 1}`]
    };
  }
  
  await workbook.xlsx.writeFile('test_validation.xlsx');
  console.log('✅ Success! File test_validation.xlsx generated');
}

test().catch(console.error);
