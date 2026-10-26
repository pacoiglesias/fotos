/* Windows headless: use timer polling and real mouse clicks without waiting on compositor frames.
   Visibility and enabled checks remain mandatory; application assertions are unchanged. */
if (process.platform === 'win32') {
  const { chromium, webkit } = require('playwright');
  let locatorPatched=false;
  function preparePage(page) {
    if (page.__realscanWindowsRuntime) return page;
    page.__realscanWindowsRuntime=true;
    if(page.context().browser()?.browserType().name()==='chromium'){
      // Capture real renderer pixels directly; Playwright's frame-stability wait can stall on Windows without a desktop.
      page.screenshot=async function(options={}){
        const session=await page.context().newCDPSession(page);
        try{
          let clip=options.clip?{...options.clip,scale:1}:undefined;
          if(options.fullPage&&!clip){const metrics=await session.send('Page.getLayoutMetrics');const size=metrics.cssContentSize||metrics.contentSize;clip={x:0,y:0,width:Math.ceil(size.width),height:Math.ceil(size.height),scale:1};}
          const format=options.type||(/\.jpe?g$/i.test(options.path||'')?'jpeg':'png');
          if(options.omitBackground)await session.send('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});
          const result=await session.send('Page.captureScreenshot',{format,fromSurface:true,captureBeyondViewport:!!options.fullPage,...(clip?{clip}:{}),...(format==='jpeg'&&options.quality!==undefined?{quality:options.quality}:{})});
          const bytes=Buffer.from(result.data,'base64');if(!bytes.length)throw Error('The renderer returned an empty screenshot.');
          if(options.path)require('fs').writeFileSync(options.path,bytes);return bytes;
        }finally{if(options.omitBackground)await session.send('Emulation.setDefaultBackgroundColorOverride').catch(()=>{});await session.detach();}
      };
    }
    const wait=page.waitForFunction.bind(page);
    page.waitForFunction=(fn,arg,options)=>wait(fn,arg,{polling:100,...options});
    if (!locatorPatched) {
      locatorPatched=true;
      const prototype=Object.getPrototypeOf(page.locator('body'));
      const click=prototype.click;
      prototype.click=async function(options={}) {
        if (options.force !== undefined || options.trial) return click.call(this,options);
        await this.waitFor({state:'visible',timeout:options.timeout??30000});
        const deadline=Date.now()+(options.timeout||30000);
        while(!await this.isEnabled()){if(Date.now()>deadline)throw Error('Cannot click a disabled control: '+this.toString());await new Promise(resolve=>setTimeout(resolve,50));}
        await this.evaluate(element=>element.scrollIntoView({behavior:'instant',block:'center',inline:'center'}));
        return click.call(this,{...options,force:true});
      };
    }
    return page;
  }
  for (const engine of [chromium,webkit]) {
    const launch=engine.launch.bind(engine);
    engine.launch=async options=>{
      const browser=await launch(engine===chromium?{...options,args:[...(options?.args||[]),'--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']}:options);
      const newContext=browser.newContext.bind(browser),newPage=browser.newPage.bind(browser);
      browser.newContext=async options=>{const context=await newContext(options);context.on('page',preparePage);return context;};
      browser.newPage=async options=>preparePage(await newPage(options));
      return browser;
    };
  }
}
