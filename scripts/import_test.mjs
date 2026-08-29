(async ()=>{
  try {
    await import('../tests/relayer.sim.test.js');
    console.log('import ok');
  } catch(e) {
    console.error('import failed');
    console.error(e);
    process.exit(1);
  }
})();
