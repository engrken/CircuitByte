// Explicit one-shot diagnostic. Normal builds exit before making a request.
import sharp from 'sharp';
import {diagramProviderFailure} from '../lib/studio-diagram-errors.mjs';
import {requestDiagramProvider,diagramImageBase64,diagramModel} from '../lib/studio-diagram-provider.mjs';
if(process.env.STUDIO_DIAGRAM_VERIFY_ON_BUILD!=='true')process.exit(0);
const credential=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN;
if(!credential){console.log('STUDIO_DIAGRAM_CHECK: credential unavailable');process.exit(0);}
try{
 const model=diagramModel();
 const response=await requestDiagramProvider({credential,model,signal:AbortSignal.timeout(145000),prompt:'Create a simple educational illustration of one Arduino Uno board with its built-in LED. White background. Label it CircuitByte image service check. No external wiring.'});
 if(!response.ok){const failure=await diagramProviderFailure(response);console.log('STUDIO_DIAGRAM_CHECK: '+JSON.stringify({status:failure.status,code:failure.code,providerCode:failure.providerCode}));}
 else{
  const result=await response.json(),data=diagramImageBase64(result);
  if(!data)throw Error();
  const metadata=await sharp(Buffer.from(data,'base64'),{limitInputPixels:20000000}).metadata();
  console.log('STUDIO_DIAGRAM_CHECK: '+JSON.stringify({status:200,model,width:metadata.width,height:metadata.height,memberQuotaConsumed:false}));
 }
}catch{console.log('STUDIO_DIAGRAM_CHECK: request or image validation failed; no member quota consumed');}
