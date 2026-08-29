import fs from 'fs';
(async ()=>{
  const content = fs.readFileSync('tests/relayer.sim.test.js','utf8');
  const re = /import\s+.*from\s+['\"](.*)['\"]/g;
  let m;
  while((m=re.exec(content))){
    const mod = m[1];
    console.log('try', mod);
    try{
      await import(mod);
      console.log('ok', mod);
    } catch(e){
      console.error('fail import', mod);
      console.error(e);
      process.exit(1);
    }
  }
  console.log('all imports ok');
})();
