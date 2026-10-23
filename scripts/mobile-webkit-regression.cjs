const cp=require('child_process');cp.execFileSync(process.execPath,[require.resolve('./mobile-local-regression.cjs')],{stdio:'inherit',env:{...process.env,REALSCAN_TEST_BROWSER:'webkit'}});
