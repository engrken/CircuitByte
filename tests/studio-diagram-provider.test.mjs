import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DIAGRAM_MODEL,requestDiagramProvider,diagramImageBase64} from '../lib/studio-diagram-provider.mjs';
test('Eligible default image model uses the image endpoint and requests one base64 result',async()=>{
 let call;
 await requestDiagramProvider({credential:'test-only',model:DEFAULT_DIAGRAM_MODEL,instructions:'Preserve labels.',prompt:'LED wiring',fetcher:async(url,options)=>{call={url,options};return Response.json({});}});
 assert.equal(call.url,'https://ai-gateway.vercel.sh/v1/images/generations');
 const body=JSON.parse(call.options.body);
 assert.equal(body.model,'bfl/flux-2-flex');assert.equal(body.n,1);assert.equal(body.response_format,'b64_json');
 assert.match(body.prompt,/Preserve labels/);assert.match(body.prompt,/LED wiring/);assert.equal(body.modalities,undefined);
});
test('Explicit Gemini configuration retains its supported chat image API',async()=>{
 let call;
 await requestDiagramProvider({credential:'test-only',model:'google/gemini-3.1-flash-image',prompt:'LED wiring',fetcher:async(url,options)=>{call={url,body:JSON.parse(options.body)};return Response.json({});}});
 assert.equal(call.url,'https://ai-gateway.vercel.sh/v1/chat/completions');
 assert.deepEqual(call.body.modalities,['text','image']);assert.equal(call.body.messages[1].content,'LED wiring');
});
test('Both response formats work, while remote URLs and malformed image data are refused',()=>{
 assert.equal(diagramImageBase64({data:[{b64_json:'YWJj'}]}),'YWJj');
 assert.equal(diagramImageBase64({choices:[{message:{images:[{image_url:{url:'data:image/png;base64,YWJj'}}]}}]}),'YWJj');
 for(const response of [{data:[{url:'https://example.invalid/image.png'}]},{data:[{b64_json:'<svg/>'}]},{choices:[]},{data:[{b64_json:''}]}])assert.equal(diagramImageBase64(response),null);
});
