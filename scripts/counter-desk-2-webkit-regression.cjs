require('child_process').execFileSync(process.execPath,[require('path').join(__dirname,'counter-desk-2-regression.cjs')],{stdio:'inherit',env:{...process.env,DESK_ENGINE:'webkit'}});
