const {test}=require('node:test');const assert=require('node:assert/strict');
const {validArtifact}=require('./verify.cjs');
test('production artifact requires HTML and production API, rejects TEST API',()=>{
 assert.equal(validArtifact('<html>',['https://api.congdongngonngu.vn/api/v1']),true);
 assert.equal(validArtifact('<html>',['https://test.onrender.com/api/v1']),false);
 assert.equal(validArtifact('<html>',['https://api.congdongngonngu.vn/api/v1','https://test.onrender.com/api/v1']),false);
 assert.equal(validArtifact('<html>',['https://api.congdongngonngu.vn/api/v1','https://site.vercel.app']),true);
 assert.equal(validArtifact('broken',['https://api.congdongngonngu.vn/api/v1']),false);
});
