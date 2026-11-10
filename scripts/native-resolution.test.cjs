const {test}=require('node:test'),assert=require('node:assert/strict');
const config=require('../metro.config');
test('all native Three imports resolve to the single entry patched by R3F',()=>{
  for(const platform of ['android','ios'])for(const isESMImport of [true,false]){
    const context={isESMImport,resolveRequest(){throw Error('Native Three must use the canonical entry');}};
    assert.deepEqual(config.resolver.resolveRequest(context,'three',platform),{type:'sourceFile',filePath:require.resolve('three')});
  }
});
test('web, addons and unrelated packages retain Metro resolution',()=>{
  for(const [name,platform] of [['three','web'],['three/examples/jsm/utils/BufferGeometryUtils.js','android'],['expo-asset','android']]){
    const result={type:'sourceFile',filePath:'normal-resolution'};
    const context={resolveRequest(c,n,p){assert.equal(c,context);assert.equal(n,name);assert.equal(p,platform);return result;}};
    assert.equal(config.resolver.resolveRequest(context,name,platform),result);
  }
});
