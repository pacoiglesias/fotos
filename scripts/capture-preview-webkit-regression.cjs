require('child_process').execFileSync(process.execPath,[require('path').join(__dirname,'capture-preview-regression.cjs')],{stdio:'inherit',env:{...process.env,REALSCAN_TEST_BROWSER:'webkit'}});
